/**
 * Script to generate metadata files from existing permissions JSON files.
 * This allows the unified indexer to start from the last indexed block
 * instead of from the deployment block.
 */

import * as fs from 'fs';
import { networkConfigs } from '../helpers/configs.js';
import { getPermissionsByNetwork, ensureMetadataDir, saveMetadata } from '../helpers/fileSystem.js';
import { NetworkMetadata, PoolMetadata, IndexedContractInfo } from '../helpers/eventIndexer.js';

const generateMetadataForNetwork = (network: string): void => {
  const permissions = getPermissionsByNetwork(network);
  const pools = networkConfigs[network]?.pools;

  if (!pools || Object.keys(permissions).length === 0) {
    console.log(`Skipping ${network}: no pools or permissions`);
    return;
  }

  const networkMetadata: NetworkMetadata = {};

  for (const poolKey of Object.keys(permissions)) {
    const poolData = permissions[poolKey];
    const poolConfig = pools[poolKey];

    if (!poolData || !poolConfig) continue;

    const indexedContracts: Record<string, IndexedContractInfo> = {};
    let maxBlock = 0;

    // ACL_MANAGER (from roles.latestBlockNumber)
    if (poolData.roles?.latestBlockNumber && poolConfig.addressBook?.ACL_MANAGER) {
      const block = poolData.roles.latestBlockNumber;
      indexedContracts['ACL_MANAGER'] = {
        address: poolConfig.addressBook.ACL_MANAGER,
        deploymentBlock: poolConfig.aclBlock || block,
        firstIndexedAt: poolConfig.aclBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // GHO_TOKEN (from roles.latestBlockNumber for GHO pools)
    if (poolData.roles?.latestBlockNumber && poolConfig.addressBook?.GHO_TOKEN && poolConfig.ghoBlock) {
      const block = poolData.roles.latestBlockNumber;
      indexedContracts['GHO_TOKEN'] = {
        address: poolConfig.addressBook.GHO_TOKEN,
        deploymentBlock: poolConfig.ghoBlock,
        firstIndexedAt: poolConfig.ghoBlock,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // GSM contracts (from gsmRoles[key].latestBlockNumber)
    if (poolData.gsmRoles && poolConfig.gsmBlocks) {
      for (const gsmKey of Object.keys(poolData.gsmRoles)) {
        const gsmData = poolData.gsmRoles[gsmKey];
        if (gsmData?.latestBlockNumber && poolConfig.addressBook?.[gsmKey]) {
          const block = gsmData.latestBlockNumber;
          indexedContracts[gsmKey] = {
            address: poolConfig.addressBook[gsmKey],
            deploymentBlock: poolConfig.gsmBlocks[gsmKey] || block,
            firstIndexedAt: poolConfig.gsmBlocks[gsmKey] || block,
          };
          maxBlock = Math.max(maxBlock, block);
        }
      }
    }

    // COLLECTOR (from collector.cRoles.latestBlockNumber)
    if (poolData.collector?.cRoles?.latestBlockNumber && poolConfig.addressBook?.COLLECTOR) {
      const block = poolData.collector.cRoles.latestBlockNumber;
      indexedContracts['COLLECTOR'] = {
        address: poolConfig.addressBook.COLLECTOR,
        deploymentBlock: poolConfig.collectorBlock || block,
        firstIndexedAt: poolConfig.collectorBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // CLINIC_STEWARD (from clinicSteward.clinicStewardRoles.latestBlockNumber)
    if (poolData.clinicSteward?.clinicStewardRoles?.latestBlockNumber && poolConfig.addressBook?.CLINIC_STEWARD) {
      const block = poolData.clinicSteward.clinicStewardRoles.latestBlockNumber;
      indexedContracts['CLINIC_STEWARD'] = {
        address: poolConfig.addressBook.CLINIC_STEWARD,
        deploymentBlock: poolConfig.clinicStewardBlock || block,
        firstIndexedAt: poolConfig.clinicStewardBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // UMBRELLA (from umbrella.umbrellaRoles.latestBlockNumber)
    if (poolData.umbrella?.umbrellaRoles?.latestBlockNumber && poolConfig.umbrellaAddressBook?.UMBRELLA) {
      const block = poolData.umbrella.umbrellaRoles.latestBlockNumber;
      indexedContracts['UMBRELLA'] = {
        address: poolConfig.umbrellaAddressBook.UMBRELLA,
        deploymentBlock: poolConfig.umbrellaBlock || block,
        firstIndexedAt: poolConfig.umbrellaBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // UMBRELLA_REWARDS_CONTROLLER (from umbrella.umbrellaIncentivesRoles.latestBlockNumber)
    if (poolData.umbrella?.umbrellaIncentivesRoles?.latestBlockNumber && poolConfig.umbrellaAddressBook?.UMBRELLA_REWARDS_CONTROLLER) {
      const block = poolData.umbrella.umbrellaIncentivesRoles.latestBlockNumber;
      indexedContracts['UMBRELLA_REWARDS_CONTROLLER'] = {
        address: poolConfig.umbrellaAddressBook.UMBRELLA_REWARDS_CONTROLLER,
        deploymentBlock: poolConfig.umbrellaIncentivesBlock || block,
        firstIndexedAt: poolConfig.umbrellaIncentivesBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // CROSS_CHAIN_CONTROLLER (from govV3.latestCCCBlockNumber)
    if (poolData.govV3?.latestCCCBlockNumber && poolConfig.governanceAddressBook?.CROSS_CHAIN_CONTROLLER) {
      const block = poolData.govV3.latestCCCBlockNumber;
      indexedContracts['CROSS_CHAIN_CONTROLLER'] = {
        address: poolConfig.governanceAddressBook.CROSS_CHAIN_CONTROLLER,
        deploymentBlock: poolConfig.crossChainControllerBlock || block,
        firstIndexedAt: poolConfig.crossChainControllerBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // GRANULAR_GUARDIAN (from govV3.ggRoles.latestBlockNumber)
    if (poolData.govV3?.ggRoles?.latestBlockNumber && poolConfig.governanceAddressBook?.GRANULAR_GUARDIAN) {
      const block = poolData.govV3.ggRoles.latestBlockNumber;
      indexedContracts['GRANULAR_GUARDIAN'] = {
        address: poolConfig.governanceAddressBook.GRANULAR_GUARDIAN,
        deploymentBlock: poolConfig.granularGuardianBlock || block,
        firstIndexedAt: poolConfig.granularGuardianBlock || block,
      };
      maxBlock = Math.max(maxBlock, block);
    }

    // Only create metadata if we found indexed contracts
    if (Object.keys(indexedContracts).length > 0) {
      const poolMetadata: PoolMetadata = {
        latestBlockNumber: maxBlock,
        indexedContracts,
      };
      networkMetadata[poolKey] = poolMetadata;
      console.log(`  ${poolKey}: ${Object.keys(indexedContracts).length} contracts, block ${maxBlock}`);
    }
  }

  if (Object.keys(networkMetadata).length > 0) {
    saveMetadata(network, networkMetadata);
    console.log(`Saved metadata for network ${network}`);
  }
};

const main = () => {
  ensureMetadataDir();

  const networks = Object.keys(networkConfigs);
  console.log(`Generating metadata for ${networks.length} networks...\n`);

  for (const network of networks) {
    console.log(`Processing network ${network}:`);
    generateMetadataForNetwork(network);
    console.log('');
  }

  console.log('Done!');
};

main();
