import { Address, Client, getAddress, getContract } from "viem";
import { AgentHubRiskOracleInfo, Contracts, PermissionsJson } from "../helpers/types.js";
import { generateRoles } from "../helpers/jsonParsers.js";
import { getSafeOwners, getSafeThreshold } from "../helpers/guardian.js";
import { getProxyAdmin } from "../helpers/proxyAdmin.js";
import { uniqueAddresses } from "../helpers/utils.js";
import { getAuthorizedSenders } from "../helpers/hubRiskOracle.js";
import { ChainId } from "@bgd-labs/toolbox";
import { onlyOwnerAbi } from "../abis/onlyOwnerAbi.js";
import { AGENT_HUB_ABI } from "../abis/agentHub.js";
import { AGENT_ABI } from "../abis/agent.js";
import { RISK_ORACLE_ABI } from "../abis/riskOracle.js";
import { networkConfigs } from "../helpers/configs.js";


export const resolveAgentHubModifiers = async (
  addressBook: any,
  provider: Client,
  permissionsObject: PermissionsJson,
  chainId: number,
  agentHubRiskOracleInfo: Record<string, AgentHubRiskOracleInfo>,
  agentHubBlock: number,
  poolName: string,
  tenderlyBlock?: number,
): Promise<{ agentHubPermissions: Contracts, agentHubRiskOracleInfo: Record<string, AgentHubRiskOracleInfo> }> => {
  let obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // hub
  if (addressBook.AGENT_HUB) {
    const hubContract = getContract({ address: getAddress(addressBook.AGENT_HUB), abi: AGENT_HUB_ABI, client: provider });
    const hubOwner = await hubContract.read.owner() as Address;

    const agentCount = Number(await hubContract.read.getAgentCount() as bigint);
    const agentAdmins: Set<Address> = new Set();
    const validationModules: Set<Address> = new Set();
    const riskOracles: Set<Address> = new Set();
    const agents: Record<Address, string> = {};

    for (let i = 0; i < agentCount; i++) {
      const agentEnabled = await hubContract.read.isAgentEnabled([i]) as boolean;
      if (agentEnabled) {
        const agentAdmin = await hubContract.read.getAgentAdmin([i]) as Address;
        const agentAddress = await hubContract.read.getAgentAddress([i]) as Address;
        const agentRiskOracle = await hubContract.read.getRiskOracle([i]) as Address;

        riskOracles.add(agentRiskOracle);
        agentAdmins.add(agentAdmin);

        // get agent info
        const agentContract = getContract({ address: getAddress(agentAddress), abi: AGENT_ABI, client: provider });
        const rangeValidatorModule = await agentContract.read.RANGE_VALIDATION_MODULE() as Address;
        const agentUpdateType = await hubContract.read.getUpdateType([i]) as string;
        const agentName = agentUpdateType.replace('Update', '');

        validationModules.add(rangeValidatorModule);

        const isPrime = agentName.toLowerCase().includes('prime');
        const isLido = poolName === 'LIDO' || poolName === 'LIDO_TENDERLY';
        const shouldSkip = isPrime !== isLido; // Skip if prime XOR lido (one true, one false)
        if (shouldSkip) {
          continue;
        }
        if (!agents[agentAddress]) {
          agents[agentAddress] = `${agentName}Agent`;
        } else {
          agents[agentAddress] = `${agents[agentAddress]}-${agentName}Agent`;
        }
      }
    }

    for (const agentAddress of Object.keys(agents)) {
      obj[agents[getAddress(agentAddress)]] = {
        address: agentAddress,
        modifiers: [
          {
            modifier: 'onlyAgentHub',
            addresses: [
              {
                address: addressBook.AGENT_HUB,
                owners: await getSafeOwners(provider, addressBook.AGENT_HUB),
                signersThreshold: await getSafeThreshold(
                  provider,
                  addressBook.AGENT_HUB,
                ),
              },
            ],
            functions: roles['Agent']['onlyAgentHub'],
          },
        ],
      };
    }

    // get proxy admin from new transparent proxy factory

    const hubProxyAdmin = await getProxyAdmin(
      addressBook.AGENT_HUB,
      provider,
    );

    const onlyAgentAdmins: { address: Address, owners: string[], signersThreshold: number }[] = [];
    for (const agentAdmin of agentAdmins) {
      onlyAgentAdmins.push({
        address: agentAdmin,
        owners: await getSafeOwners(provider, agentAdmin),
        signersThreshold: await getSafeThreshold(provider, agentAdmin),
      });
    }

    obj['AgentHub'] = {
      address: addressBook.AGENT_HUB,
      proxyAdmin: hubProxyAdmin,
      modifiers: [
        {
          modifier: 'onlyOwner',
          addresses: [
            {
              address: hubOwner,
              owners: await getSafeOwners(provider, hubOwner),
              signersThreshold: await getSafeThreshold(provider, hubOwner),
            },
          ],
          functions: roles['AgentHub']['onlyOwner'],
        },
        {
          modifier: 'onlyOwnerOrAgentAdmin',
          addresses: uniqueAddresses([
            ...onlyAgentAdmins,
            {
              address: hubOwner,
              owners: await getSafeOwners(provider, hubOwner),
              signersThreshold: await getSafeThreshold(provider, hubOwner),
            },
          ]),
          functions: roles['AgentHub']['onlyOwnerOrAgentAdmin'],
        },
      ],
    };

    const proxyAdminContract = getContract({ address: getAddress(hubProxyAdmin), abi: onlyOwnerAbi, client: provider });
    const proxyAdminOwner = await proxyAdminContract.read.owner() as Address;

    obj['AgentHubProxyAdmin'] = {
      address: hubProxyAdmin,
      modifiers: [
        {
          modifier: 'onlyOwner',
          addresses: [
            {
              address: proxyAdminOwner,
              owners: await getSafeOwners(provider, proxyAdminOwner),
              signersThreshold: await getSafeThreshold(provider, proxyAdminOwner),
            },
          ],
          functions: roles['ProxyAdmin']['onlyOwner'],
        },
      ],
    };

    // module
    if (validationModules.size > 0) {
      const validationModulesArray = Array.from(validationModules);
      for (let index = 0; index < validationModulesArray.length; index++) {
        const validationModule = validationModulesArray[index];
        obj[`RangeValidationModule${validationModulesArray.length > 1 ? `-${index}` : ''}`] = {
          address: validationModule,
          modifiers: [
            {
              modifier: 'onlyHubOwnerOrAgentAdmin',
              addresses: uniqueAddresses([
                ...onlyAgentAdmins,
                {
                  address: hubOwner,
                  owners: await getSafeOwners(provider, hubOwner),
                  signersThreshold: await getSafeThreshold(provider, hubOwner),
                },
              ]),
              functions: roles['RangeValidationModule']['onlyHubOwnerOrAgentAdmin'],
            },
          ],
        };
      }
    }

    // risk oracle
    if (riskOracles.size > 0) {
      const riskOraclesArray = Array.from(riskOracles);
      for (let index = 0; index < riskOraclesArray.length; index++) {
        const riskOracle = riskOraclesArray[index];

        const riskOracleContract = getContract({ address: getAddress(riskOracle), abi: RISK_ORACLE_ABI, client: provider });
        const riskOracleOwner = await riskOracleContract.read.owner() as Address;
        const onlyAuthorized: { address: Address, owners: string[], signersThreshold: number }[] = [];

        let preAuthorizedSenders: string[] = [];
        if (!agentHubRiskOracleInfo[riskOracle] || Object.keys(agentHubRiskOracleInfo[riskOracle]).length === 0) {
          preAuthorizedSenders = networkConfigs[Number(chainId)].pools[poolName].hubRiskOracleInitialSenders ?? [];
        }

        const { authorizedSenders, latestBlockNumber } = await getAuthorizedSenders(
          provider,
          agentHubRiskOracleInfo[riskOracle] || { address: riskOracle, authorizedSenders: preAuthorizedSenders, latestBlockNumber: agentHubBlock } as AgentHubRiskOracleInfo,
          chainId,
          poolName,
          tenderlyBlock,
        );

        agentHubRiskOracleInfo[riskOracle] = {
          authorizedSenders: authorizedSenders,
          latestBlockNumber: latestBlockNumber,
          address: riskOracle,
        };

        for (const authorizedSender of authorizedSenders) {
          const isAuthorized = await riskOracleContract.read.isAuthorized([authorizedSender]);
          if (isAuthorized) {
            onlyAuthorized.push({
              address: getAddress(authorizedSender),
              owners: await getSafeOwners(provider, authorizedSender),
              signersThreshold: await getSafeThreshold(provider, authorizedSender),
            });
          } else {
            console.error(`Authorized sender ${authorizedSender} is not authorized for risk oracle ${riskOracle} on chainId ${chainId}`);
          }
        }

        obj[`RiskOracle${riskOracles.size > 1 ? `-${index}` : ''}`] = {
          address: riskOracle,
          modifiers: [
            {
              modifier: 'onlyOwner',
              addresses: [
                {
                  address: riskOracleOwner,
                  owners: await getSafeOwners(provider, riskOracleOwner),
                  signersThreshold: await getSafeThreshold(provider, riskOracleOwner),
                },
              ],
              functions: roles['RiskOracle']['onlyOwner'],
            },
            {
              modifier: 'onlyAuthorized',
              addresses: [
                ...onlyAuthorized,
              ],
              functions: roles['RiskOracle']['onlyAuthorized'],
            },
          ],
        };
      }
    }
  }

  return { agentHubPermissions: obj, agentHubRiskOracleInfo: agentHubRiskOracleInfo };
};