import { Contracts, PermissionsJson } from './types.js';
import {
  getAllPermissionsJson,
  getPermissionsByNetwork,
  saveJson,
} from './fileSystem.js';

export type MethodsByModifier = Record<string, Record<string, string[]>>;

export const generateRoles = (
  functionPermissions: PermissionsJson,
): MethodsByModifier => {
  const permissionsObj: MethodsByModifier = {};

  functionPermissions.forEach(({ contract, functions }, index) => {
    permissionsObj[contract] = {};
    functionPermissions[index].functions.forEach(({ name, roles }) => {
      roles.forEach((role) => {
        if (!permissionsObj[contract][role]) {
          permissionsObj[contract][role] = [];
        }
        permissionsObj[contract][role].push(name);
      });
    });
  });

  return permissionsObj;
};

export const generateContractsByAddress = (
  contracts: Contracts,
): Record<string, string> => {
  const contractsByAddress: Record<string, string> = {};
  Object.keys(contracts).forEach((contract) => {
    contractsByAddress[contracts[contract].address] = contract;
  });

  return contractsByAddress;
};

/**
 * Extracts all contracts from a pool's various sections.
 * Used to build address-to-name lookup tables and contract aggregation.
 */
export const extractPoolContracts = (poolData: any): Record<string, any> => {
  if (!poolData) return {};

  const sections = ['contracts', 'govV3', 'collector', 'clinicSteward', 'umbrella', 'ppc', 'agentHub'];
  const allContracts: Record<string, any> = {};

  for (const section of sections) {
    const sectionData = poolData[section];
    if (!sectionData) continue;

    // Some sections have contracts nested, others are the contracts directly
    const contracts = sectionData.contracts || sectionData;
    if (typeof contracts === 'object' && contracts !== null) {
      // Only add if it looks like a contracts object (has address property in values)
      for (const [key, value] of Object.entries(contracts)) {
        if (value && typeof value === 'object' && 'address' in (value as any)) {
          allContracts[key] = value;
        }
      }
    }
  }

  return allContracts;
};

/**
 * Lazy lookup for contract name by address.
 * Searches across pools with priority:
 * 1. Current pool's sections (highest priority)
 * 2. Parent pool (if Tenderly)
 * 3. V3 pool (if current pool is not V3)
 * 4. GHO contracts (for mainnet, lowest priority)
 *
 * @param address - The address to look up (will be normalized to lowercase)
 * @param network - The network chain ID
 * @param pool - The current pool being processed
 * @param tenderlyBasePool - The parent pool if this is a Tenderly pool
 * @returns The contract name if found, undefined otherwise
 */
export const findContractNameByAddress = (
  address: string,
  network: string,
  pool: string,
  tenderlyBasePool?: string,
): string | undefined => {
  const networkPermits = getPermissionsByNetwork(network);
  const normalizedAddress = address.toLowerCase();
  const isV3Pool = pool === 'V3';
  const isWhiteLabelPool = pool === 'V3_WHITE_LABEL';
  const isTenderly = pool.toLowerCase().includes('tenderly');

  // Helper to search in a pool's contracts
  const findInPool = (poolData: any): string | undefined => {
    const contracts = extractPoolContracts(poolData);
    for (const [contractName, contractInfo] of Object.entries(contracts)) {
      if ((contractInfo as any).address?.toLowerCase() === normalizedAddress) {
        return contractName;
      }
    }
    return undefined;
  };

  // 1. Search current pool first (highest priority)
  let found = findInPool(networkPermits[pool]);
  if (found) return found;

  // 2. Search parent pool (if Tenderly)
  if (isTenderly && tenderlyBasePool) {
    found = findInPool(networkPermits[tenderlyBasePool]);
    if (found) return found;
  }

  // 3. Search V3 pool (if current pool is not V3 or V3_WHITE_LABEL)
  if (!isV3Pool && !isWhiteLabelPool) {
    found = findInPool(networkPermits['V3']);
    if (found) return found;
  }

  // 4. Search GHO contracts (only for mainnet)
  if (network === '1') {
    found = findInPool(networkPermits['GHO']);
    if (found) return found;
  }

  return undefined;
};

export const overwriteBaseTenderlyPool = async (
  destinationPoolKey: string,
  network: string,
  basePoolKey: string,
) => {
  const permissions = { ...getPermissionsByNetwork(network) };

  // copy base pool to destionation pool
  permissions[destinationPoolKey] = { ...permissions[basePoolKey] };

  saveJson(
    `./out/permissions/${network}-permissions.json`,
    JSON.stringify(permissions, null, 2),
  );
  console.log(`Copied ${basePoolKey} to ${destinationPoolKey}`);
};
