import { Client } from 'viem';
import { Guardian } from './types.js';
import { getSafeOwners, getSafeThreshold } from './guardian.js';

/**
 * OwnerResolver provides cached resolution of Safe owners and thresholds.
 *
 * This class prevents redundant RPC calls when the same address appears
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
 * const resolver = new OwnerResolver(provider);
 *
 * // These make only 1 RPC call total (cached after first call)
 * const info1 = await resolver.resolve('0x123...');
 * const info2 = await resolver.resolve('0x123...');
 *
 * // Bulk resolve all addresses from adminRoles
 * const owners = await resolver.resolveRoleOwners(adminRoles);
 * ```
 */
export class OwnerResolver {
  private cache = new Map<string, Guardian>();

  constructor(private provider: Client) {}

  /**
   * Resolves Safe owners and threshold for an address.
   * Results are cached so subsequent calls for the same address
   * return immediately without additional RPC calls.
   */
  async resolve(address: string): Promise<Guardian> {
    const key = address.toLowerCase();

    // Return cached result if available
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Make RPC calls only once per address
    const guardian: Guardian = {
      owners: await getSafeOwners(this.provider, address),
      threshold: await getSafeThreshold(this.provider, address),
    };

    // Store in cache for future lookups
    this.cache.set(key, guardian);
    return guardian;
  }

  /**
   * Bulk resolve all addresses from adminRoles.
   * Leverages the cache so shared addresses are only queried once.
   *
   * @param adminRoles - Record mapping role names to arrays of addresses
   * @returns Record mapping role names to records of address -> Guardian
   */
  async resolveRoleOwners(
    adminRoles: Record<string, string[]>
  ): Promise<Record<string, Record<string, Guardian>>> {
    const owners: Record<string, Record<string, Guardian>> = {};

    for (const [roleName, addresses] of Object.entries(adminRoles)) {
      owners[roleName] = {};
      for (const address of addresses) {
        // This may hit cache if address was seen in another role
        owners[roleName][address] = await this.resolve(address);
      }
    }

    return owners;
  }

  /**
   * Clear the cache.
   * Useful when switching networks/providers or for testing.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns the number of cached entries.
   * Useful for debugging and testing.
   */
  get cacheSize(): number {
    return this.cache.size;
  }
}
