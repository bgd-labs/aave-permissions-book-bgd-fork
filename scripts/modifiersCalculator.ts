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
import { getRPCClient, getRpcClientFromUrl } from '../helpers/rpc.js';
import { resolvePpcModifiers } from './ppcPermissions.js';
import { resolveAgentHubModifiers } from './agentHubPermissions.js';
import {
  isTenderlyPool,
  isV3TenderlyPool,
  getV3ProviderForPool,
  logTableGeneration,
} from '../helpers/poolHelpers.js';
import {
  indexPoolEvents,
  buildPoolContractConfigs,
} from '../helpers/eventIndexer.js';

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
      if (pool.tenderlyBasePool && isTenderlyPool(poolKey)) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
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
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(
          poolKey,
          network,
          pool.tenderlyBasePool,
        );
      }
      if (Object.keys(pool.addressBook).length > 0) {
        poolPermissions = await resolveV2Modifiers(
          pool.addressBook,
          poolKey === Pools.V2_TENDERLY ||
            poolKey === Pools.V2_AMM_TENDERLY ||
            poolKey === Pools.V2_ARC_TENDERLY
            ? getRpcClientFromUrl(pool.tenderlyRpcUrl!)
            : provider,
          permissionsJson,
          Pools[poolKey as keyof typeof Pools],
          network,
        );
      }
    } else if (poolKey === Pools.GOV_V2 || poolKey === Pools.GOV_V2_TENDERLY) {
      logTableGeneration(network, poolKey);

      poolPermissions = await resolveGovV2Modifiers(
        pool.addressBook,
        isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider,
        permissionsJson,
      );
    } else if (
      poolKey === Pools.SAFETY_MODULE ||
      poolKey === Pools.SAFETY_MODULE_TENDERLY
    ) {
      logTableGeneration(network, poolKey);
      poolPermissions = await resolveSafetyV2Modifiers(
        pool.addressBook,
        isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider,
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
        isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider,
        permissionsJson,
      );
    } else if (poolKey === Pools.GHO || poolKey === Pools.GHO_TENDERLY) {
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(
          poolKey,
          network,
          pool.tenderlyBasePool,
        );
        fullJson = getPermissionsByNetwork(network);
      }

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

            const poolRoles = getPermissionsByNetwork(network)['V3']?.roles?.role || {} as Record<string, string[]>;
            poolPermissions = await resolveGHOModifiers(
              pool.addressBook,
              isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider,
              permissionsJson,
              admins.role,
              gsmAdmins,
              pool.addresses || {},
              poolRoles,
            );
          }
        }
      }
    } else if (pool.aclBlock) {
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

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
      console.log(`pool not supported: ${poolKey} for network: ${network}`);
    }

    // =========================================================================
    // ADDITIONAL COMPONENTS (Collector, ClinicSteward, Umbrella, etc.)
    // =========================================================================

    if (pool.collectorBlock && pool.addressBook.COLLECTOR) {
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

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
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

      logTableGeneration(network, poolKey, 'Clinic Steward', indexedLatestBlock || pool.clinicStewardBlock);

      const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;

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

      const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;
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

      const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;

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
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

      logTableGeneration(network, poolKey, 'Agent Hub');

      const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;
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
    console.log(`----${network} : ${poolKey} finished`);
  }

  // save permissions in json object
  console.log(
    `-----------${network} : ------------------SAVE JSON-----------------------------------`,
  );
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
      console.log(`Skipping network ${network}: no matching pools`);
      return Promise.resolve();
    }
    return generateNetworkPermissions(network, pools);
  });

  await Promise.allSettled(permissions);
  console.log('--------------FINISHED--------------')
}

main();
