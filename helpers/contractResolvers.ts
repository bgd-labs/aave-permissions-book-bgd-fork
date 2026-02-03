import { Address, Client, getAddress, getContract } from 'viem';
import { onlyOwnerAbi } from '../abis/onlyOwnerAbi.js';
import { AddressInfo, ContractInfo, Guardian } from './types.js';
import { OwnerResolver } from './ownerResolver.js';

/**
 * Type for the roles object returned by generateRoles().
 * Maps contract names to modifier names to function arrays.
 */
type MethodsByModifier = Record<string, Record<string, string[]>>;

/**
 * Resolves permissions for a simple Ownable contract.
 * Replaces 20+ near-identical code blocks.
 *
 * @param contractName - The name of the contract (used for roles lookup)
 * @param address - The contract address (if undefined, returns null)
 * @param provider - Viem client for RPC calls
 * @param ownerResolver - Cached owner resolver
 * @param roles - The roles object from generateRoles()
 * @param proxyAdmin - Optional proxy admin address
 * @returns ContractInfo or null if address is undefined
 */
export const resolveOwnableContract = async (
  contractName: string,
  address: string | undefined,
  provider: Client,
  ownerResolver: OwnerResolver,
  roles: MethodsByModifier,
  proxyAdmin?: string,
): Promise<ContractInfo | null> => {
  if (!address) return null;

  const contract = getContract({
    address: getAddress(address),
    abi: onlyOwnerAbi,
    client: provider,
  });
  const owner = (await contract.read.owner()) as Address;
  const ownerInfo = await ownerResolver.resolve(owner);

  return {
    address,
    proxyAdmin,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: owner,
            owners: ownerInfo.owners,
            signersThreshold: ownerInfo.threshold,
          },
        ],
        functions: roles[contractName]?.['onlyOwner'] || [],
      },
    ],
  };
};

/**
 * Maps admin role addresses to AddressInfo objects.
 * Replaces 10+ identical mapping patterns.
 *
 * @param roleName - The role name (e.g., 'POOL_ADMIN', 'RISK_ADMIN')
 * @param adminRoles - Record mapping role names to address arrays
 * @param owners - Record mapping role names to address -> Guardian records
 * @returns Array of AddressInfo objects
 */
export const mapRoleAddresses = (
  roleName: string,
  adminRoles: Record<string, string[]>,
  owners: Record<string, Record<string, Guardian>>,
): AddressInfo[] => {
  if (!adminRoles[roleName]) return [];

  return adminRoles[roleName].map((roleAddress) => ({
    address: roleAddress,
    owners: owners[roleName]?.[roleAddress]?.owners || [],
    signersThreshold: owners[roleName]?.[roleAddress]?.threshold || 0,
  }));
};

/**
 * Configuration for an Edge Risk Steward contract.
 */
export interface EdgeStewardConfig {
  /** Address book key (e.g., 'EDGE_RISK_STEWARD_CAPS') */
  addressKey: string;
  /** Contract name in output (e.g., 'EdgeRiskStewardCaps') */
  contractName: string;
  /** Roles key if different from contractName (e.g., for EdgeRiskStewardEMode using EDGE_RISK_STEWARD_PENDLE_EMODE) */
  rolesKey?: string;
}

/**
 * Standard Edge Risk Steward configurations.
 */
export const EDGE_STEWARD_CONFIGS: EdgeStewardConfig[] = [
  { addressKey: 'EDGE_RISK_STEWARD_CAPS', contractName: 'EdgeRiskStewardCaps' },
  { addressKey: 'EDGE_RISK_STEWARD_DISCOUNT_RATE', contractName: 'EdgeRiskStewardDiscountRate' },
  { addressKey: 'EDGE_RISK_STEWARD_RATES', contractName: 'EdgeRiskStewardRates' },
  { addressKey: 'EDGE_RISK_STEWARD_PENDLE_EMODE', contractName: 'EdgeRiskStewardEMode' },
];

/**
 * Resolves permissions for a Risk Council contract (owner + RISK_COUNCIL).
 * Used for Edge Risk Stewards.
 *
 * @param contractName - The name of the contract
 * @param rolesKey - The key in roles object (defaults to contractName)
 * @param address - The contract address
 * @param provider - Viem client for RPC calls
 * @param ownerResolver - Cached owner resolver
 * @param roles - The roles object from generateRoles()
 * @param abi - The contract ABI (must have owner() and RISK_COUNCIL() methods)
 * @returns ContractInfo or null if address is undefined
 */
export const resolveRiskCouncilContract = async (
  contractName: string,
  rolesKey: string,
  address: string | undefined,
  provider: Client,
  ownerResolver: OwnerResolver,
  roles: MethodsByModifier,
  abi: readonly unknown[],
): Promise<ContractInfo | null> => {
  if (!address) return null;

  const contract = getContract({
    address: getAddress(address),
    abi,
    client: provider,
  });
  const owner = (await contract.read.owner()) as Address;
  const riskCouncil = (await contract.read.RISK_COUNCIL()) as Address;

  const ownerInfo = await ownerResolver.resolve(owner);
  const councilInfo = await ownerResolver.resolve(riskCouncil);

  return {
    address,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: owner,
            owners: ownerInfo.owners,
            signersThreshold: ownerInfo.threshold,
          },
        ],
        functions: roles[rolesKey]?.['onlyOwner'] || [],
      },
      {
        modifier: 'onlyRiskCouncil',
        addresses: [
          {
            address: riskCouncil,
            owners: councilInfo.owners,
            signersThreshold: councilInfo.threshold,
          },
        ],
        functions: roles[rolesKey]?.['onlyRiskCouncil'] || [],
      },
    ],
  };
};

/**
 * Resolves permissions for an Owner+Guardian contract.
 * Used for steward injectors.
 *
 * @param contractName - The name of the contract
 * @param address - The contract address
 * @param provider - Viem client for RPC calls
 * @param ownerResolver - Cached owner resolver
 * @param roles - The roles object from generateRoles()
 * @param abi - The contract ABI (must have owner() and guardian() methods)
 * @returns ContractInfo or null if address is undefined
 */
export const resolveOwnerGuardianContract = async (
  contractName: string,
  address: string | undefined,
  provider: Client,
  ownerResolver: OwnerResolver,
  roles: MethodsByModifier,
  abi: readonly unknown[],
): Promise<ContractInfo | null> => {
  if (!address) return null;

  const contract = getContract({
    address: getAddress(address),
    abi,
    client: provider,
  });
  const owner = (await contract.read.owner()) as Address;
  const guardian = (await contract.read.guardian()) as Address;

  const ownerInfo = await ownerResolver.resolve(owner);
  const guardianInfo = await ownerResolver.resolve(guardian);

  return {
    address,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: owner,
            owners: ownerInfo.owners,
            signersThreshold: ownerInfo.threshold,
          },
        ],
        functions: roles[contractName]?.['onlyOwner'] || [],
      },
      {
        modifier: 'onlyOwnerOrGuardian',
        addresses: [
          {
            address: guardian,
            owners: guardianInfo.owners,
            signersThreshold: guardianInfo.threshold,
          },
          {
            address: owner,
            owners: ownerInfo.owners,
            signersThreshold: ownerInfo.threshold,
          },
        ],
        functions: roles[contractName]?.['onlyOwnerOrGuardian'] || [],
      },
    ],
  };
};

/**
 * Resolves all role owners using the OwnerResolver cache.
 * Replaces the manual nested loop pattern.
 *
 * @param adminRoles - Record mapping role names to address arrays
 * @param ownerResolver - Cached owner resolver
 * @returns Record mapping role names to address -> Guardian records
 */
export const resolveAllRoleOwners = async (
  adminRoles: Record<string, string[]>,
  ownerResolver: OwnerResolver,
): Promise<Record<string, Record<string, Guardian>>> => {
  const owners: Record<string, Record<string, Guardian>> = {};

  for (const roleName of Object.keys(adminRoles)) {
    owners[roleName] = {};
    for (const roleAddress of adminRoles[roleName]) {
      owners[roleName][roleAddress] = await ownerResolver.resolve(roleAddress);
    }
  }

  return owners;
};
