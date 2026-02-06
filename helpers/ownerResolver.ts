import { Client } from 'viem';
import { Guardian } from './types.js';
import { getSafeOwners, getSafeThreshold } from './guardian.js';

/**
 * Owner resolver return type.
 */
export interface OwnerResolver {
  resolve: (address: string) => Promise<Guardian>;
  resolveRoleOwners: (adminRoles: Record<string, string[]>) => Promise<Record<string, Record<string, Guardian>>>;
  clear: () => void;
  cacheSize: () => number;
}

/**
 * Creates a cached resolver for Safe owners and thresholds.
 *
 * This prevents redundant RPC calls when the same address appears
 * multiple times across different roles. The cache is in-memory and lives
 * for the duration of a single network's permission generation.
 *
 * Why in-memory cache (not file-based):
 * - Safe owners/thresholds can change between runs (signers added/removed)
 * - We always want fresh data from the blockchain
 * - The cache only prevents redundant calls *within a single run*
 *
 * @example
 * ```typescript
 * const resolver = createOwnerResolver(provider);
 *
 * // These make only 1 RPC call total (cached after first call)
 * const info1 = await resolver.resolve('0x123...');
 * const info2 = await resolver.resolve('0x123...');
 *
 * // Bulk resolve all addresses from adminRoles
 * const owners = await resolver.resolveRoleOwners(adminRoles);
 * ```
 */
export const createOwnerResolver = (provider: Client): OwnerResolver => {
  const cache = new Map<string, Guardian>();

  /**
   * Resolves Safe owners and threshold for an address.
   * Results are cached so subsequent calls for the same address
   * return immediately without additional RPC calls.
   */
  const resolve = async (address: string): Promise<Guardian> => {
    const key = address.toLowerCase();

    // Return cached result if available
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Make RPC calls only once per address
    const guardian: Guardian = {
      owners: await getSafeOwners(provider, address),
      threshold: await getSafeThreshold(provider, address),
    };

    // Store in cache for future lookups
    cache.set(key, guardian);
    return guardian;
  };

  /**
   * Bulk resolve all addresses from adminRoles.
   * Leverages the cache so shared addresses are only queried once.
   *
   * @param adminRoles - Record mapping role names to arrays of addresses
   * @returns Record mapping role names to records of address -> Guardian
   */
  const resolveRoleOwners = async (
    adminRoles: Record<string, string[]>
  ): Promise<Record<string, Record<string, Guardian>>> => {
    const owners: Record<string, Record<string, Guardian>> = {};

    for (const [roleName, addresses] of Object.entries(adminRoles)) {
      owners[roleName] = {};
      for (const address of addresses) {
        // This may hit cache if address was seen in another role
        owners[roleName][address] = await resolve(address);
      }
    }

    return owners;
  };

  return {
    resolve,
    resolveRoleOwners,
    clear: () => cache.clear(),
    cacheSize: () => cache.size,
  };
};
