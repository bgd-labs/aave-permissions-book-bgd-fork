import { generateRoles } from '../helpers/jsonParsers.js';
import { AddressBook, Contracts, PermissionsJson } from '../helpers/types.js';
import { Client, zeroAddress } from 'viem';
import { uniqueAddresses } from '../helpers/addressUtils.js';
import { createOwnerResolver } from '../helpers/ownerResolver.js';
import { resolveAllRoleOwners, mapRoleAddresses } from '../helpers/contractResolvers.js';

export const resolveClinicStewardModifiers = async (
  addressBook: AddressBook,
  provider: Client,
  permissionsObject: PermissionsJson,
  adminRoles: Record<string, string[]>,
): Promise<Contracts> => {
  const obj: Contracts = {};
  const roles = generateRoles(permissionsObject);

  // Create owner resolver with caching for this network
  const ownerResolver = createOwnerResolver(provider);

  // Resolve all role owners (with caching to avoid redundant RPC calls)
  const owners = await resolveAllRoleOwners(adminRoles, ownerResolver);

  if (
    addressBook.CLINIC_STEWARD &&
    addressBook.CLINIC_STEWARD !== zeroAddress
  ) {
    obj['ClinicSteward'] = {
      address: addressBook.CLINIC_STEWARD,
      modifiers: [
        {
          modifier: 'onlyCleanUpRole',
          addresses: uniqueAddresses(mapRoleAddresses('CLEANUP_ROLE', adminRoles, owners)),
          functions: roles['ClinicSteward']['onlyCleanUpRole'],
        },
        {
          modifier: 'onlyAdmin',
          addresses: uniqueAddresses(mapRoleAddresses('DEFAULT_ADMIN', adminRoles, owners)),
          functions: roles['ClinicSteward']['onlyAdmin'],
        },
      ],
    };
  }

  return obj;
};
