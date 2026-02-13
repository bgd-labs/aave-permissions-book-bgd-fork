/**
 * Main orchestrator for generating on-chain permission snapshots.
 *
 * This script processes each network's pools sequentially, and for each pool:
 * 1. Indexes on-chain events (RoleGranted/RoleRevoked/SenderUpdated) to build role assignments
 * 2. Resolves contract permissions via RPC calls (owner, proxyAdmin, modifiers)
 * 3. Saves the combined result as JSON for later table generation
 *
 * Pool types are processed via a dispatch chain (V2, GovV2, Safety, V2Misc, GHO, V3/ACL).
 * Additional components (Collector, ClinicSteward, Umbrella, etc.) run independently
 * after the main pool type processing - they attach to any pool that has the required config.
 *
 * Tenderly pools are simulated forks of mainnet pools. They inherit the parent pool's
 * permissions state via `applyTenderlyBasePool`, then layer fork-specific changes on top.
 *
 * Usage: npm run modifiers:generate [--network <chainId>] [--pool <poolKey>] [--tenderly]
 */
import 'dotenv/config';
import {
  clinicStewardRoleNames,
  collectorRoleNames,
  ghoGSMRoleNames,
  ghoRoleNames,
  granularGuardianRoleNames,
  networkConfigs,
  Pools,
  protocolRoleNames,
  umbrellaIncentivesRoleNames,
  umbrellaRoleNames,
} from '../helpers/configs.js';
import {
  parseCliArgs,
  getNetworksToProcess,
  getPoolsToProcess,
  logExecutionConfig,
} from '../helpers/cli.js';
import {
  getPermissionsByNetwork,
  getPoolMetadata,
  getStaticPermissionsJson,
  saveJson,
  updatePoolMetadata,
} from '../helpers/fileSystem.js';
import { getRoleAdmins } from '../helpers/adminRoles.js';
import { resolveV2Modifiers } from './v2Permissions.js';
import { resolveV3Modifiers } from './v3Permissions.js';
import { resolveGovV2Modifiers } from './governancePermissions.js';
import { AgentHub, ClinicSteward, Collector, Contracts, GovV3, Ppc, Roles, Umbrella } from '../helpers/types.js';
import { resolveSafetyV2Modifiers } from './safetyPermissions.js';
import { resolveV2MiscModifiers } from './v2MiscPermissions.js';
import { getSenders } from '../helpers/crossChainControllerLogs.js';
import { resolveGovV3Modifiers } from './govV3Permissions.js';
import { resolveGHOModifiers } from './ghoPermissions.js';
import { overwriteBaseTenderlyPool } from '../helpers/jsonParsers.js';
import { resolveCollectorModifiers } from './collectorPermissions.js';
import { resolveClinicStewardModifiers } from './clinicStewardPermissions.js';
import { resolveUmbrellaModifiers } from './umbrellaPermissions.js';
import { getRPCClient } from '../helpers/rpc.js';
import { resolvePpcModifiers } from './ppcPermissions.js';
import { resolveAgentHubModifiers } from './agentHubPermissions.js';
import {
  isTenderlyPool,
  isV3TenderlyPool,
  getProviderForPool,
  getV3ProviderForPool,
  logTableGeneration,
} from '../helpers/poolHelpers.js';
import {
  indexPoolEvents,
  buildPoolContractConfigs,
} from '../helpers/eventIndexer.js';
import { logger } from '../helpers/logger.js';

/**
 * Applies Tenderly base pool state by copying the parent pool's permissions
 * and returning the refreshed permissions JSON.
 * Returns the current fullJson unchanged if no tenderlyBasePool is configured.
 */
const applyTenderlyBasePool = async (
  poolKey: string,
  network: number | string,
  tenderlyBasePool: string | undefined,
  currentJson: Record<string, any>,
): Promise<Record<string, any>> => {
  if (!tenderlyBasePool) return currentJson;
  await overwriteBaseTenderlyPool(poolKey, network, tenderlyBasePool);
  return getPermissionsByNetwork(String(network));
};

const generateNetworkPermissions = async (network: number, poolsToProcess: string[]) => {
  // get current permissions
  let fullJson = getPermissionsByNetwork(String(network));
  // generate permissions
  let provider = getRPCClient(network)

  const pools = networkConfigs[network].pools;
  for (let i = 0; i < poolsToProcess.length; i++) {
    const poolKey = poolsToProcess[i];
    const pool = pools[poolKey];

    const permissionsJson = getStaticPermissionsJson(pool.permissionsJson);
    let poolPermissions: Contracts = {};
    let admins = {} as Roles;
    let gsmAdmins = {} as Record<string, Roles>;
    let collector = {} as Collector;
    let clinicSteward = {} as ClinicSteward;
    let umbrella = {} as Umbrella;
    let govV3 = {} as GovV3;
    let ppc = {} as Ppc;
    govV3.ggRoles = {} as Roles;
    let agentHub = {} as AgentHub;

    // =========================================================================
    // UNIFIED EVENT INDEXING
    // For pools that need event-based role tracking, we fetch all events once
    // For Tenderly pools:
    // 1. Copy parent pool's state (mainnet at parent's latestBlockNumber)
    // 2. Index mainnet from parent's latestBlockNumber to current block
    // 3. Index Tenderly fork events from tenderlyBlock onwards
    // =========================================================================
    const needsEventIndexing =
      pool.aclBlock ||
      pool.ghoBlock ||
      pool.collectorBlock ||
      pool.clinicStewardBlock ||
      pool.umbrellaBlock ||
      pool.crossChainControllerBlock ||
      pool.granularGuardianBlock;

    // Store indexed events for later processing
    let indexedEvents: Record<string, import('viem').Log[]> = {};
    let indexedLatestBlock = 0;

    if (needsEventIndexing) {
      // For Tenderly pools:
      // 1. Copy parent pool's current state (mainnet state at parent's latestBlockNumber)
      // 2. Index mainnet from parent's latestBlockNumber to current (via parent metadata)
      // 3. Index Tenderly fork events from tenderlyBlock onwards
      if (isTenderlyPool(poolKey)) {
        fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);
      }

      // Build contract configs for unified indexing
      const contractConfigs = buildPoolContractConfigs({
        addressBook: pool.addressBook,
        umbrellaAddressBook: pool.umbrellaAddressBook,
        governanceAddressBook: pool.governanceAddressBook,
        aclBlock: pool.aclBlock,
        collectorBlock: pool.collectorBlock,
        clinicStewardBlock: pool.clinicStewardBlock,
        umbrellaBlock: pool.umbrellaBlock,
        umbrellaIncentivesBlock: pool.umbrellaIncentivesBlock,
        crossChainControllerBlock: pool.crossChainControllerBlock,
        granularGuardianBlock: pool.granularGuardianBlock,
        ghoBlock: pool.ghoBlock,
        gsmBlocks: pool.gsmBlocks,
      });
      
      if (contractConfigs.length > 0) {
        // For Tenderly pools: use PARENT pool's metadata to start mainnet indexing
        // from parent's latestBlockNumber (after copying parent's state)
        // For regular pools: use own metadata for incremental indexing
        const metadataSourcePool = isTenderlyPool(poolKey) && pool.tenderlyBasePool
          ? pool.tenderlyBasePool
          : poolKey;
        const existingMetadata = getPoolMetadata(network, metadataSourcePool);

        // Index all events in one call
        const indexResult = await indexPoolEvents({
          client: provider,
          chainId: network,
          poolKey,
          contracts: contractConfigs,
          poolMetadata: existingMetadata,
        });

        indexedEvents = indexResult.eventsByContract;
        indexedLatestBlock = indexResult.latestBlockNumber;

        // Save updated metadata to the CURRENT pool (not the parent)
        // This tracks the mainnet block we've indexed up to
        updatePoolMetadata(network, poolKey, indexResult.poolMetadata);

        logTableGeneration(network, poolKey, 'Events indexed', indexedLatestBlock);
      }
    }

    // =========================================================================
    // POOL TYPE PROCESSING
    // Each pool type has a distinct contract architecture and different
    // permission resolution logic. The order matters: specific pool types
    // (GOV_V2, SAFETY_MODULE, V2_MISC, GHO) are matched first, then
    // V3 pools are identified by having an aclBlock. The first branch
    // catches V2 pools (V2, V2_AMM, V2_ARC, LIDO, ETHERFI) by exclusion.
    // =========================================================================

    if (
      poolKey !== Pools.GOV_V2 &&
      poolKey !== Pools.GOV_V2_TENDERLY &&
      poolKey !== Pools.SAFETY_MODULE &&
      poolKey !== Pools.SAFETY_MODULE_TENDERLY &&
      poolKey !== Pools.V2_MISC_TENDERLY &&
      poolKey !== Pools.V2_MISC &&
      poolKey !== Pools.TENDERLY &&
      poolKey !== Pools.GHO_TENDERLY &&
      poolKey !== Pools.GHO &&
      !pool.aclBlock &&
      !pool.crossChainControllerBlock
    ) {
      logTableGeneration(network, poolKey);
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);
      if (Object.keys(pool.addressBook).length > 0) {
        poolPermissions = await resolveV2Modifiers(
          pool.addressBook,
          getProviderForPool(poolKey, pool, provider),
          permissionsJson,
          Pools[poolKey as keyof typeof Pools],
          network,
        );
      }
    } else if (poolKey === Pools.GOV_V2 || poolKey === Pools.GOV_V2_TENDERLY) {
      logTableGeneration(network, poolKey);

      poolPermissions = await resolveGovV2Modifiers(
        pool.addressBook,
        getProviderForPool(poolKey, pool, provider),
        permissionsJson,
      );
    } else if (
      poolKey === Pools.SAFETY_MODULE ||
      poolKey === Pools.SAFETY_MODULE_TENDERLY
    ) {
      logTableGeneration(network, poolKey);
      poolPermissions = await resolveSafetyV2Modifiers(
        pool.addressBook,
        getProviderForPool(poolKey, pool, provider),
        permissionsJson,
      );
    } else if (
      poolKey === Pools.V2_MISC ||
      poolKey === Pools.V2_MISC_TENDERLY
    ) {
      logTableGeneration(network, poolKey);
      poolPermissions = await resolveV2MiscModifiers(
        pool.addressBook,
        pool.addresses || {},
        getProviderForPool(poolKey, pool, provider),
        permissionsJson,
      );
    } else if (poolKey === Pools.GHO || poolKey === Pools.GHO_TENDERLY) {
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);
      if (pool.ghoBlock) {
        logTableGeneration(network, poolKey, undefined, indexedLatestBlock || pool.ghoBlock);
        if (Object.keys(pool.addressBook).length > 0) {
          // Process GHO_TOKEN roles from indexed events
          const ghoEvents = indexedEvents['GHO_TOKEN'] || [];
          const ghoRoles = getRoleAdmins({
            oldRoles: (fullJson[poolKey]?.roles?.role) || {},
            roleNames: ghoRoleNames,
            eventLogs: ghoEvents,
          });
          admins = {
            role: ghoRoles,
          };

          // Process GSM roles from indexed events
          if (pool.gsmBlocks) {
            for (const key of Object.keys(pool.gsmBlocks)) {
              const gsmEvents = indexedEvents[key] || [];
              const gsmRoles = getRoleAdmins({
                oldRoles: (fullJson[poolKey]?.gsmRoles?.[key]?.role) || {},
                roleNames: ghoGSMRoleNames,
                eventLogs: gsmEvents,
              });
              gsmAdmins[key] = {
                role: gsmRoles,
              };
            }
      
            // GHO permission resolution needs the V3 pool's ACL roles to check
            // if GHO facilitators/bucket managers are also V3 pool admins
            const poolRoles = getPermissionsByNetwork(network)['V3']?.roles?.role || {} as Record<string, string[]>;
            poolPermissions = await resolveGHOModifiers(
              pool.addressBook,
              getProviderForPool(poolKey, pool, provider),
              permissionsJson,
              admins.role,
              gsmAdmins,
              pool.addresses || {},
              poolRoles,
              network,
            );
          }
        }
      }
    } else if (pool.aclBlock) {
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);

      logTableGeneration(network, poolKey, undefined, indexedLatestBlock || pool.aclBlock);

      if (Object.keys(pool.addressBook).length > 0) {
        const poolProvider = getV3ProviderForPool(poolKey, pool, provider);

        // Process ACL_MANAGER roles from indexed events
        const aclEvents = indexedEvents['ACL_MANAGER'] || [];
        const aclRoles = getRoleAdmins({
          oldRoles: (fullJson[poolKey]?.roles?.role) || {},
          roleNames: protocolRoleNames,
          eventLogs: aclEvents,
        });
        admins = {
          role: aclRoles,
        };

        poolPermissions = await resolveV3Modifiers(
          pool.addressBook,
          poolProvider,
          permissionsJson,
          Pools[poolKey as keyof typeof Pools],
          Number(network),
          admins.role,
        );
      }
    } else {
      logger.warn(`pool not supported: ${poolKey}`, { network });
    }

    // =========================================================================
    // ADDITIONAL COMPONENTS (Collector, ClinicSteward, Umbrella, etc.)
    // These run independently of the pool type dispatch above. Any pool
    // that has the required config (e.g. collectorBlock + COLLECTOR address)
    // will have the component processed, regardless of whether it's V2/V3/GHO.
    // =========================================================================

    if (pool.collectorBlock && pool.addressBook.COLLECTOR) {
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);

      logTableGeneration(network, poolKey, 'Collector', indexedLatestBlock || pool.collectorBlock);

      const poolProvider = getV3ProviderForPool(poolKey, pool, provider);

      // Process COLLECTOR roles from indexed events
      const collectorEvents = indexedEvents['COLLECTOR'] || [];
      const collectorRoles = getRoleAdmins({
        oldRoles: (fullJson[poolKey]?.collector?.cRoles?.role) || {},
        roleNames: collectorRoleNames,
        collector: true,
        eventLogs: collectorEvents,
      });
      const cAdmins: Roles = {
        role: collectorRoles,
      };

      const collectorPermissions = await resolveCollectorModifiers(
        pool.addressBook,
        poolProvider,
        permissionsJson,
        Number(network),
        cAdmins.role,
      );
      collector.contracts = collectorPermissions;
      collector.cRoles = cAdmins;
    }

    if (pool.clinicStewardBlock && pool.addressBook.CLINIC_STEWARD) {
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);

      logTableGeneration(network, poolKey, 'Clinic Steward', indexedLatestBlock || pool.clinicStewardBlock);

      const poolProvider = getProviderForPool(poolKey, pool, provider);

      // Process CLINIC_STEWARD roles from indexed events
      const clinicEvents = indexedEvents['CLINIC_STEWARD'] || [];
      const clinicRoles = getRoleAdmins({
        oldRoles: (fullJson[poolKey]?.clinicSteward?.clinicStewardRoles?.role) || {},
        roleNames: clinicStewardRoleNames,
        collector: true,
        eventLogs: clinicEvents,
      });
      const clinicStewardRolesResult: Roles = {
        role: clinicRoles,
      };

      const clinicStewardPermissions = await resolveClinicStewardModifiers(
        pool.addressBook,
        poolProvider,
        permissionsJson,
        clinicStewardRolesResult.role,
      );
      clinicSteward.contracts = clinicStewardPermissions;
      clinicSteward.clinicStewardRoles = clinicStewardRolesResult;
    }

    if (pool.ppcPermissionsJson && pool.ppcAddressBook) {
      logTableGeneration(network, poolKey, 'Permissioned Payloads Controller');

      const poolProvider = getProviderForPool(poolKey, pool, provider);
      const ppcPermissions = await resolvePpcModifiers(
        pool.ppcAddressBook,
        poolProvider,
        getStaticPermissionsJson(pool.ppcPermissionsJson),
        Number(network),
      );
      ppc.contracts = ppcPermissions;
    }


    if (pool.umbrellaBlock && pool.umbrellaAddressBook && pool.umbrellaIncentivesBlock) {
      logTableGeneration(network, poolKey, `Umbrella`, indexedLatestBlock || pool.umbrellaBlock);

      const poolProvider = getProviderForPool(poolKey, pool, provider);

      // Process UMBRELLA roles from indexed events
      const umbrellaEvents = indexedEvents['UMBRELLA'] || [];
      const umbrellaRolesResult = getRoleAdmins({
        oldRoles: (fullJson[poolKey]?.umbrella?.umbrellaRoles?.role) || {},
        roleNames: umbrellaRoleNames,
        eventLogs: umbrellaEvents,
      });
      const umbrellaRoles: Roles = {
        role: umbrellaRolesResult,
      };

      // Process UMBRELLA_REWARDS_CONTROLLER roles from indexed events
      const umbrellaIncentivesEvents = indexedEvents['UMBRELLA_REWARDS_CONTROLLER'] || [];
      const umbrellaIncentivesRolesResult = getRoleAdmins({
        oldRoles: (fullJson[poolKey]?.umbrella?.umbrellaIncentivesRoles?.role) || {},
        roleNames: umbrellaIncentivesRoleNames,
        eventLogs: umbrellaIncentivesEvents,
      });
      const umbrellaIncentivesRoles: Roles = {
        role: umbrellaIncentivesRolesResult,
      };

      const umbrellaPermissions = await resolveUmbrellaModifiers(
        pool.umbrellaAddressBook,
        poolProvider,
        permissionsJson,
        umbrellaRoles.role,
        umbrellaIncentivesRoles.role,
      );

      umbrella.contracts = umbrellaPermissions;
      umbrella.umbrellaRoles = umbrellaRoles;
      umbrella.umbrellaIncentivesRoles = umbrellaIncentivesRoles;
    }

    if (pool.functionsPermissionsAgentHubJson) {
      fullJson = await applyTenderlyBasePool(poolKey, network, pool.tenderlyBasePool, fullJson);

      logTableGeneration(network, poolKey, 'Agent Hub');

      const poolProvider = getProviderForPool(poolKey, pool, provider);
      const { agentHubPermissions } = await resolveAgentHubModifiers(
        pool.addressBook,
        poolProvider,
        getStaticPermissionsJson(pool.functionsPermissionsAgentHubJson),
        poolKey,
      );
      agentHub.contracts = agentHubPermissions;
    }

    // =========================================================================
    // GOVERNANCE (CrossChainController + GranularGuardian)
    // =========================================================================

    if (
      pool.crossChainControllerBlock &&
      pool.crossChainPermissionsJson &&
      pool.governanceAddressBook
    ) {
      logTableGeneration(network, poolKey, 'Governance', indexedLatestBlock || pool.crossChainControllerBlock);

      // Process CROSS_CHAIN_CONTROLLER senders from indexed events
      const cccEvents = indexedEvents['CROSS_CHAIN_CONTROLLER'] || [];
      const senders = getSenders({
        oldSenders: (fullJson[poolKey]?.govV3?.senders) || [],
        eventLogs: cccEvents,
      });

      if (pool.granularGuardianBlock && pool.governanceAddressBook.GRANULAR_GUARDIAN) {
        // Process GRANULAR_GUARDIAN roles from indexed events
        const ggEvents = indexedEvents['GRANULAR_GUARDIAN'] || [];
        const ggRolesResult = getRoleAdmins({
          oldRoles: (fullJson[poolKey]?.govV3?.ggRoles?.role) || {},
          roleNames: granularGuardianRoleNames,
          eventLogs: ggEvents,
        });

        govV3.ggRoles.role = ggRolesResult;
      }

      const permissionsGovV3Json = getStaticPermissionsJson(
        pool.crossChainPermissionsJson,
      );

      const poolProvider = getV3ProviderForPool(poolKey, pool, provider);
      govV3.contracts = await resolveGovV3Modifiers(
        pool.governanceAddressBook,
        poolProvider,
        permissionsGovV3Json,
        Number(network),
        senders,
        isV3TenderlyPool(poolKey),
        govV3.ggRoles.role || {},
        pool.addresses,
      );

      govV3.senders = senders;
    }

    // Merge this pool's results into the network-wide JSON.
    // If the file was empty (first pool), initialize the structure.
    // Each pool's data is keyed by its poolKey (e.g., 'V3', 'GHO', 'V2').
    if (Object.keys(fullJson).length === 0) {
      fullJson = {
        [poolKey]: {
          contracts: poolPermissions,
          roles: admins,
          gsmRoles: gsmAdmins,
          govV3: govV3,
          collector: collector,
          clinicSteward: clinicSteward,
          umbrella: umbrella,
          ppc: ppc,
          agentHub: agentHub,
        },
      };
    } else {
      // if (!fullJson[network][poolKey]) {
      fullJson[poolKey] = {
        contracts: poolPermissions,
        roles: admins,
        gsmRoles: gsmAdmins,
        govV3: govV3,
        collector: collector,
        clinicSteward: clinicSteward,
        umbrella: umbrella,
        ppc: ppc,
        agentHub: agentHub,
      };
    }
    logger.poolFinished(String(network), poolKey);
  }

  // save permissions in json object
  logger.info(`Saving JSON for network ${network}`);
  saveJson(
    `out/permissions/${network}-permissions.json`,
    JSON.stringify(fullJson, null, 2),
  );
};

async function main() {
  const args = parseCliArgs();
  logExecutionConfig(args);

  const networks = getNetworksToProcess(args);

  const permissions = networks.map((network) => {
    const pools = getPoolsToProcess(network, args);
    if (pools.length === 0) {
      logger.info(`Skipping network ${network}: no matching pools`);
      return Promise.resolve();
    }
    return generateNetworkPermissions(network, pools);
  });

  // allSettled ensures all networks complete even if some fail (e.g., RPC errors).
  // Each network writes its own output file independently.
  const results = await Promise.allSettled(permissions);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('Network failed:', result.reason);
    }
  }
  logger.finished();
}

main();
