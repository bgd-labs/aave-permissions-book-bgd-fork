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
  getPermissionsByNetwork,
  getStaticPermissionsJson,
  saveJson,
} from '../helpers/fileSystem.js';
import { getCurrentRoleAdmins } from '../helpers/adminRoles.js';
import { resolveV2Modifiers } from './v2Permissions.js';
import { resolveV3Modifiers } from './v3Permissions.js';
import { resolveGovV2Modifiers } from './governancePermissions.js';
import { AgentHub, ClinicSteward, Collector, Contracts, GovV3, Ppc, Roles, Umbrella } from '../helpers/types.js';
import { resolveSafetyV2Modifiers } from './safetyPermissions.js';
import { resolveV2MiscModifiers } from './v2MiscPermissions.js';
import { getCCCSendersAndAdapters } from '../helpers/crossChainControllerLogs.js';
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
  resolveFromBlock,
} from '../helpers/poolHelpers.js';

const generateNetworkPermissions = async (network: string) => {
  // get current permissions
  let fullJson = getPermissionsByNetwork(network);
  // generate permissions
  let provider = getRPCClient(Number(network))

  const pools = networkConfigs[network].pools;
  const poolsKeys = Object.keys(pools).map((pool) => pool);
  for (let i = 0; i < poolsKeys.length; i++) {
    const poolKey = poolsKeys[i];
    if (
      (!process.env.TENDERLY || process.env.TENDERLY === 'false') &&
      poolKey.toLowerCase().indexOf('tenderly') > -1
    ) {
      continue;
    }
    const pool = pools[poolKey];

    const permissionsJson = getStaticPermissionsJson(pool.permissionsJson);
    let poolPermissions: Contracts = {};
    let admins = {} as Roles;
    let gsmAdmins = {} as Record<string, Roles>;
    let collector = {} as Collector;
    let clinicSteward = {} as ClinicSteward;
    let umbrella = {} as Umbrella;
    let cAdmins = {} as Roles;
    let govV3 = {} as GovV3;
    let ppc = {} as Ppc;
    govV3.ggRoles = {} as Roles;
    let agentHub = {} as AgentHub;

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
      let fromBlock;
      let gsmBlock;
      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(
          poolKey,
          network,
          pool.tenderlyBasePool,
        );
        // get current permissions
        fullJson = getPermissionsByNetwork(network);
        fromBlock = pool.tenderlyBlock;
        gsmBlock = pool.tenderlyBlock;
      } else {
        fromBlock =
          fullJson[poolKey]?.roles?.latestBlockNumber || pool.ghoBlock;
      }

      if (fromBlock) {
        logTableGeneration(network, poolKey, undefined, fromBlock);
        if (Object.keys(pool.addressBook).length > 0) {
          admins = await getCurrentRoleAdmins(
            provider,
            (fullJson[poolKey] && fullJson[poolKey]?.roles?.role) ||
            ({} as Record<string, string[]>),
            fromBlock,
            network,
            Pools[poolKey as keyof typeof Pools],
            ghoRoleNames,
            pool.addressBook.GHO_TOKEN,
          );

          // get gsms admin roles
          if (pool.gsmBlocks) {
            for (let i = 0; i < Object.keys(pool.gsmBlocks).length; i++) {
              const key = Object.keys(pool.gsmBlocks)[i];
              let gsmBlock = pool.gsmBlocks[key];
              if (
                fullJson[poolKey] &&
                // @ts-ignore
                Object.keys(fullJson[poolKey].gsmRoles).length > 0 &&
                !pool.tenderlyBasePool
              ) {
                gsmBlock =
                  fullJson[poolKey].gsmRoles?.[key].latestBlockNumber || 0;
              }
              gsmAdmins[key] = await getCurrentRoleAdmins(
                provider,
                (fullJson[poolKey] &&
                  // @ts-ignore
                  Object.keys(fullJson[poolKey].gsmRoles).length > 0 &&
                  fullJson[poolKey]?.gsmRoles?.[key].role) ||
                ({} as Record<string, string[]>),
                gsmBlock,
                network,
                Pools[poolKey as keyof typeof Pools],
                ghoGSMRoleNames,
                pool.addressBook[key],
              );
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
      const fromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.aclBlock,
        savedBlock: fullJson[poolKey]?.roles?.latestBlockNumber,
      });

      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

      if (fromBlock) {
        logTableGeneration(network, poolKey, undefined, fromBlock);

        if (Object.keys(pool.addressBook).length > 0) {
          const poolProvider = getV3ProviderForPool(poolKey, pool, provider);

          admins = await getCurrentRoleAdmins(
            poolProvider,
            (fullJson[poolKey] && fullJson[poolKey]?.roles?.role) ||
            ({} as Record<string, string[]>),
            fromBlock,
            network,
            Pools[poolKey as keyof typeof Pools],
            protocolRoleNames,
            pool.addressBook.ACL_MANAGER,
          );

          poolPermissions = await resolveV3Modifiers(
            pool.addressBook,
            poolProvider,
            permissionsJson,
            Pools[poolKey as keyof typeof Pools],
            Number(network),
            admins.role,
          );
        }
      }
    } else {
      console.log(`pool not supported: ${poolKey} for network: ${network}`);
    }

    if (pool.collectorBlock && pool.addressBook.COLLECTOR) {
      const fromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.collectorBlock,
        savedBlock: fullJson[poolKey]?.collector?.cRoles?.latestBlockNumber,
      });

      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

      logTableGeneration(network, poolKey, 'Collector', fromBlock);

      if (fromBlock) {
        const poolProvider = getV3ProviderForPool(poolKey, pool, provider);

        cAdmins = await getCurrentRoleAdmins(
          poolProvider,
          (fullJson[poolKey] && fullJson[poolKey]?.collector?.cRoles?.role) ||
          ({} as Record<string, string[]>),
          fromBlock,
          network,
          Pools[poolKey as keyof typeof Pools],
          collectorRoleNames,
          pool.addressBook.COLLECTOR,
          true
        );

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
    }

    if (pool.clinicStewardBlock && pool.addressBook.CLINIC_STEWARD) {
      const fromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.clinicStewardBlock,
        savedBlock: fullJson[poolKey]?.clinicSteward?.clinicStewardRoles?.latestBlockNumber,
      });

      if (pool.tenderlyBasePool) {
        await overwriteBaseTenderlyPool(poolKey, network, pool.tenderlyBasePool);
        fullJson = getPermissionsByNetwork(network);
      }

      logTableGeneration(network, poolKey, 'Clinic Steward', fromBlock);

      if (fromBlock) {
        const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;

        cAdmins = await getCurrentRoleAdmins(
          poolProvider,
          (fullJson[poolKey] && fullJson[poolKey]?.clinicSteward?.clinicStewardRoles?.role) ||
          ({} as Record<string, string[]>),
          fromBlock,
          network,
          Pools[poolKey as keyof typeof Pools],
          clinicStewardRoleNames,
          pool.addressBook.CLINIC_STEWARD,
          true
        );

        const clinicStewardPermissions = await resolveClinicStewardModifiers(
          pool.addressBook,
          poolProvider,
          permissionsJson,
          cAdmins.role,
        );
        clinicSteward.contracts = clinicStewardPermissions;
        clinicSteward.clinicStewardRoles = cAdmins;
      }
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
      const umbrellaFromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.umbrellaBlock,
        savedBlock: fullJson[poolKey]?.umbrella?.umbrellaRoles?.latestBlockNumber,
      });

      const umbrellaIncentivesFromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.umbrellaIncentivesBlock,
        savedBlock: fullJson[poolKey]?.umbrella?.umbrellaIncentivesRoles?.latestBlockNumber,
      });

      if (umbrellaFromBlock && umbrellaIncentivesFromBlock) {
        logTableGeneration(network, poolKey, `Umbrella (${umbrellaFromBlock} | ${umbrellaIncentivesFromBlock})`);

        const poolProvider = isTenderlyPool(poolKey) ? getRpcClientFromUrl(pool.tenderlyRpcUrl!) : provider;

        const umbrellaRoles = await getCurrentRoleAdmins(
          poolProvider,
          (fullJson[poolKey] && fullJson[poolKey]?.umbrella?.umbrellaRoles?.role) ||
          ({} as Record<string, string[]>),
          umbrellaFromBlock,
          network,
          Pools[poolKey as keyof typeof Pools],
          umbrellaRoleNames,
          pool.umbrellaAddressBook.UMBRELLA,
        );

        const umbrellaIncentivesRoles = await getCurrentRoleAdmins(
          poolProvider,
          (fullJson[poolKey] && fullJson[poolKey]?.umbrella?.umbrellaIncentivesRoles?.role) ||
          ({} as Record<string, string[]>),
          umbrellaIncentivesFromBlock,
          network,
          Pools[poolKey as keyof typeof Pools],
          umbrellaIncentivesRoleNames,
          pool.umbrellaAddressBook.UMBRELLA_REWARDS_CONTROLLER,
        );

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



    if (
      pool.crossChainControllerBlock &&
      pool.crossChainPermissionsJson &&
      pool.governanceAddressBook
    ) {
      const cccFromBlock = resolveFromBlock({
        hasTenderlyBase: !!pool.tenderlyBasePool,
        tenderlyBlock: pool.tenderlyBlock,
        configBlock: pool.crossChainControllerBlock,
        savedBlock: fullJson[poolKey]?.govV3?.latestCCCBlockNumber,
      });

      logTableGeneration(network, poolKey, 'Governance', cccFromBlock);

      if (cccFromBlock) {
        const { senders, latestCCCBlockNumber } =
          await getCCCSendersAndAdapters(
            provider,
            (fullJson[poolKey] && fullJson[poolKey]?.govV3?.senders) || [],
            cccFromBlock,
            pool.governanceAddressBook,
            network,
            Pools[poolKey as keyof typeof Pools],
          );

        if (pool.granularGuardianBlock) {
          const ggFromBlock = resolveFromBlock({
            hasTenderlyBase: !!pool.tenderlyBasePool,
            tenderlyBlock: pool.tenderlyBlock,
            configBlock: pool.granularGuardianBlock,
            savedBlock: fullJson[poolKey]?.govV3?.ggRoles?.latestBlockNumber,
          });

          if (ggFromBlock && pool.governanceAddressBook.GRANULAR_GUARDIAN) {
            const poolProvider = getV3ProviderForPool(poolKey, pool, provider);

            const ggRoles = await getCurrentRoleAdmins(
              poolProvider,
              (fullJson[poolKey] &&
                fullJson[poolKey]?.govV3?.ggRoles?.role) ||
              ({} as Record<string, string[]>),
              ggFromBlock,
              network,
              Pools[poolKey as keyof typeof Pools],
              granularGuardianRoleNames,
              pool.governanceAddressBook.GRANULAR_GUARDIAN,
            );

            govV3.ggRoles.role = ggRoles.role;
            govV3.ggRoles.latestBlockNumber = ggRoles.latestBlockNumber;
          }
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
        govV3.latestCCCBlockNumber = latestCCCBlockNumber;
      }
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
  const networks = Object.keys(networkConfigs).map((network) => network);
  const permissions = networks.map((network) =>
    generateNetworkPermissions(network),
  );

  // const permissions = [];
  // for (const network of networks) {
  //   console.log(`Generating permissions for network: ${network}`);
  //   const result = await generateNetworkPermissions(network);
  //   permissions.push(result);
  //   console.log(`Permissions generated for network: ${network}`);
  // }


  await Promise.allSettled(permissions);
  console.log('--------------FINISHED--------------')
}

main();
