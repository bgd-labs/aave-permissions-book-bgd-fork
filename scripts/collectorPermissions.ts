import { onlyOwnerAbi } from '../abis/onlyOwnerAbi.js';
import { generateRoles } from '../helpers/jsonParsers.js';
import { getProxyAdmin } from '../helpers/proxyAdmin.js';
import { ChainId } from '@bgd-labs/toolbox';
import {
  Contracts,
  PermissionsJson,
} from '../helpers/types.js';
import { Address, Client, getAddress, getContract, zeroAddress } from 'viem';
import { uniqueAddresses } from '../helpers/addressUtils.js';
import { createOwnerResolver } from '../helpers/ownerResolver.js';
import { resolveAllRoleOwners, mapRoleAddresses } from '../helpers/contractResolvers.js';

export const resolveCollectorModifiers = async (
  addressBook: any,
  provider: Client,
  permissionsObject: PermissionsJson,
  chainId: typeof ChainId | number,
  adminRoles: Record<string, string[]>,
): Promise<Contracts> => {
  const obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // Create owner resolver with caching for this network
  const ownerResolver = createOwnerResolver(provider);

  // Resolve all role owners (with caching to avoid redundant RPC calls)
  const owners = await resolveAllRoleOwners(adminRoles, ownerResolver);

  if (
    addressBook.COLLECTOR &&
    addressBook.COLLECTOR !== zeroAddress
  ) {
    const collectorProxyAdmin = await getProxyAdmin(
      addressBook.COLLECTOR,
      provider,
    );
    const proxyAdminInfo = await ownerResolver.resolve(collectorProxyAdmin);

    obj['Collector'] = {
      address: addressBook.COLLECTOR,
      modifiers: [
        {
          modifier: 'onlyFundsAdmin',
          addresses: mapRoleAddresses('FUNDS_ADMIN_ROLE', adminRoles, owners),
          functions: roles['Collector']['onlyFundsAdmin'],
        },
        {
          modifier: 'onlyAdminOrRecipient',
          addresses: [
            {
              address: collectorProxyAdmin,
              owners: proxyAdminInfo.owners,
              signersThreshold: proxyAdminInfo.threshold,
            },
            ...uniqueAddresses(mapRoleAddresses('FUNDS_ADMIN_ROLE', adminRoles, owners)),
          ],
          functions: roles['Collector']['onlyAdminOrRecipient'],
        },
      ],
    };
  }

  if ((!addressBook.PROXY_ADMIN && addressBook.TRANSPARENT_PROXY_FACTORY) || chainId === 42220) {
    const collectorProxyAdmin = await getProxyAdmin(
      addressBook.COLLECTOR,
      provider,
    );
    const proxyAdminContract = getContract({ address: getAddress(collectorProxyAdmin), abi: onlyOwnerAbi, client: provider });
    if (collectorProxyAdmin !== zeroAddress) {
      const proxyAdminOwner = await proxyAdminContract.read.owner() as Address;
      const ownerInfo = await ownerResolver.resolve(proxyAdminOwner);

      obj['CollectorProxyAdmin'] = {
        address: collectorProxyAdmin,
        modifiers: [
          {
            modifier: 'onlyOwner',
            addresses: [
              {
                address: proxyAdminOwner,
                owners: ownerInfo.owners,
                signersThreshold: ownerInfo.threshold,
              },
            ],
            functions: roles['ProxyAdmin']['onlyOwner'],
          },
        ],
      };
    }
  }

  // add proxy admins
  const proxyAdminContracts: string[] = permissionsObject
    .filter((contract) => contract.proxyAdmin)
    .map((contract) => contract.contract);
  for (let i = 0; i < proxyAdminContracts.length; i++) {
    if (obj[proxyAdminContracts[i]]) {
      obj[proxyAdminContracts[i]]['proxyAdmin'] = await getProxyAdmin(
        obj[proxyAdminContracts[i]].address,
        provider,
      );
    }
  }

  return obj;
};
