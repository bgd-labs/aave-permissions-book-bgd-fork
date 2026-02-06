import { Address, Client, getAddress, getContract } from "viem";
import { AddressBook, Contracts, PermissionsJson } from "../helpers/types.js";
import { generateRoles } from "../helpers/jsonParsers.js";
import { getProxyAdmin } from "../helpers/proxyAdmin.js";
import { uniqueAddresses } from "../helpers/addressUtils.js";
import { onlyOwnerAbi } from "../abis/onlyOwnerAbi.js";
import { AGENT_HUB_ABI } from "../abis/agentHub.js";
import { AGENT_ABI } from "../abis/agent.js";
import { createOwnerResolver } from "../helpers/ownerResolver.js";


export const resolveAgentHubModifiers = async (
  addressBook: AddressBook,
  provider: Client,
  permissionsObject: PermissionsJson,
  poolName: string,
): Promise<{ agentHubPermissions: Contracts }> => {
  const obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // Create owner resolver with caching for this network
  const ownerResolver = createOwnerResolver(provider);

  // hub
  if (addressBook.AGENT_HUB) {
    const hubContract = getContract({ address: getAddress(addressBook.AGENT_HUB), abi: AGENT_HUB_ABI, client: provider });
    const hubOwner = await hubContract.read.owner() as Address;

    const agentCount = Number(await hubContract.read.getAgentCount() as bigint);
    const agentAdmins: Set<Address> = new Set();
    const validationModules: Set<Address> = new Set();
    const agents: Record<Address, string> = {};

    for (let i = 0; i < agentCount; i++) {
      const agentEnabled = await hubContract.read.isAgentEnabled([i]) as boolean;
      if (agentEnabled) {
        const agentAdmin = await hubContract.read.getAgentAdmin([i]) as Address;
        const agentAddress = await hubContract.read.getAgentAddress([i]) as Address;
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

    // Resolve hubOwner info (used multiple times)
    const hubOwnerInfo = await ownerResolver.resolve(hubOwner);
    const agentHubInfo = await ownerResolver.resolve(addressBook.AGENT_HUB);

    for (const agentAddress of Object.keys(agents)) {
      obj[agents[getAddress(agentAddress)]] = {
        address: agentAddress,
        modifiers: [
          {
            modifier: 'onlyAgentHub',
            addresses: [
              {
                address: addressBook.AGENT_HUB,
                owners: agentHubInfo.owners,
                signersThreshold: agentHubInfo.threshold,
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

    // Resolve all agent admins using cache
    const onlyAgentAdmins: { address: Address, owners: string[], signersThreshold: number }[] = [];
    for (const agentAdmin of agentAdmins) {
      const adminInfo = await ownerResolver.resolve(agentAdmin);
      onlyAgentAdmins.push({
        address: agentAdmin,
        owners: adminInfo.owners,
        signersThreshold: adminInfo.threshold,
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
              owners: hubOwnerInfo.owners,
              signersThreshold: hubOwnerInfo.threshold,
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
              owners: hubOwnerInfo.owners,
              signersThreshold: hubOwnerInfo.threshold,
            },
          ]),
          functions: roles['AgentHub']['onlyOwnerOrAgentAdmin'],
        },
      ],
    };

    const proxyAdminContract = getContract({ address: getAddress(hubProxyAdmin), abi: onlyOwnerAbi, client: provider });
    const proxyAdminOwner = await proxyAdminContract.read.owner() as Address;
    const proxyAdminOwnerInfo = await ownerResolver.resolve(proxyAdminOwner);

    obj['AgentHubProxyAdmin'] = {
      address: hubProxyAdmin,
      modifiers: [
        {
          modifier: 'onlyOwner',
          addresses: [
            {
              address: proxyAdminOwner,
              owners: proxyAdminOwnerInfo.owners,
              signersThreshold: proxyAdminOwnerInfo.threshold,
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
                  owners: hubOwnerInfo.owners,
                  signersThreshold: hubOwnerInfo.threshold,
                },
              ]),
              functions: roles['RangeValidationModule']['onlyHubOwnerOrAgentAdmin'],
            },
          ],
        };
      }
    }
  }

  return { agentHubPermissions: obj };
};
