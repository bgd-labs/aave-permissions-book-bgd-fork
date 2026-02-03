# Aave Permissions Book - Improvement Plan

## Executive Summary

After a thorough analysis of the codebase, I've identified several areas for improvement focused on:
- **Maintainability**: Reducing code duplication and improving organization
- **Readability**: Better abstractions, documentation, and clearer logic flow
- **Type Safety**: Eliminating `any` types and `@ts-ignore` comments
- **Error Handling**: Proper error handling and logging
- **Performance**: Caching and batching opportunities

The goal is to maintain **100% output compatibility** - the generated `out/*.md` tables must remain identical.

---

## 1. Code Duplication Issues (High Priority)

### 1.1 Duplicated Helper Functions

**Problem**: Several utility functions are copy-pasted across multiple files:

| Function | Files Where Duplicated |
|----------|----------------------|
| `uniqueAddresses()` | v3Permissions.ts, ghoPermissions.ts, collectorPermissions.ts, govV3Permissions.ts, umbrellaPermissions.ts |
| `getAddressInfo()` | v3Permissions.ts, collectorPermissions.ts, umbrellaPermissions.ts |
| Owner resolution pattern | All permission scripts |

**Current Code** (repeated 5+ times):
```typescript
const uniqueAddresses = (addressesInfo: AddressInfo[]): AddressInfo[] => {
  const cleanAddresses: AddressInfo[] = [];
  addressesInfo.forEach((addressInfo) => {
    const found = cleanAddresses.find(
      (cleanAddressInfo) => cleanAddressInfo.address === addressInfo.address,
    );
    if (!found) {
      cleanAddresses.push(addressInfo);
    }
  });
  return cleanAddresses;
};
```

**Solution**: Create `helpers/addressUtils.ts`:
```typescript
// helpers/addressUtils.ts
export const uniqueAddresses = (addresses: AddressInfo[]): AddressInfo[] => {
  return [...new Map(addresses.map(a => [a.address.toLowerCase(), a])).values()];
};

export const getAddressInfo = async (
  provider: Client,
  address: string,
): Promise<AddressInfo> => ({
  address,
  owners: await getSafeOwners(provider, address),
  signersThreshold: await getSafeThreshold(provider, address),
});
```

### 1.2 Owner Resolution Pattern

**Problem**: This pattern is repeated 50+ times across permission scripts:
```typescript
owners[roleName][roleAddress] = {
  owners: await getSafeOwners(provider, roleAddress),
  threshold: await getSafeThreshold(provider, roleAddress),
};
```

Each call to `getSafeOwners` and `getSafeThreshold` makes RPC calls. The same address often appears in multiple roles (e.g., the Executor contract might be both `POOL_ADMIN` and `DEFAULT_ADMIN`), causing redundant RPC calls for the same address.

**Solution**: Create a centralized `OwnerResolver` class with **in-memory caching per network run**:

```typescript
// helpers/ownerResolver.ts
export class OwnerResolver {
  // Cache lives for the duration of a single network's permission generation
  // Key: lowercase address, Value: resolved Guardian info
  private cache = new Map<string, Guardian>();

  constructor(private provider: Client) {}

  /**
   * Resolves Safe owners and threshold for an address.
   * Results are cached so subsequent calls for the same address
   * return immediately without additional RPC calls.
   *
   * Example: If address 0x123 is called 5 times across different roles,
   * only 1 RPC call is made; the other 4 return cached data.
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
   * Clear the cache (useful when switching networks/providers)
   */
  clear(): void {
    this.cache.clear();
  }
}
```

**Usage in permission scripts**:
```typescript
// Before (current code - makes RPC calls every time):
for (const roleName of Object.keys(adminRoles)) {
  for (const roleAddress of adminRoles[roleName]) {
    owners[roleName][roleAddress] = {
      owners: await getSafeOwners(provider, roleAddress),  // RPC call
      threshold: await getSafeThreshold(provider, roleAddress),  // RPC call
    };
  }
}

// After (with OwnerResolver - cached):
const resolver = new OwnerResolver(provider);
const owners = await resolver.resolveRoleOwners(adminRoles);
// If same address appears in 3 roles, only 1 RPC call is made
```

**Why in-memory cache (not file-based)**:
- Safe owners/thresholds can change between runs (signers added/removed)
- We always want fresh data from the blockchain
- The cache only prevents redundant calls *within a single run*
- Cache is cleared when `OwnerResolver` instance is garbage collected or `.clear()` is called

---

## 2. Configuration Organization (High Priority)

### 2.1 Monolithic configs.ts

**Problem**: `helpers/configs.ts` is ~1300 lines containing:
- Pool enum definitions
- Role name constants
- Network name mappings
- All network configurations with hardcoded block numbers and addresses

**Solution**: Split into modular structure:

```
helpers/
├── configs/
│   ├── index.ts              # Re-exports all
│   ├── pools.ts              # Pools enum
│   ├── roles.ts              # All role name constants
│   ├── networks/
│   │   ├── index.ts          # NetworkConfigs aggregation
│   │   ├── ethereum.ts
│   │   ├── polygon.ts
│   │   ├── arbitrum.ts
│   │   └── ...
│   └── types.ts              # Config-specific types
```

**Example** - `configs/networks/ethereum.ts`:
```typescript
import { AaveV3Ethereum, GovernanceV3Ethereum } from '@bgd-labs/aave-address-book';
import { Pools } from '../pools';
import { Network } from '../types';

export const ethereumConfig: Network = {
  name: 'Ethereum',
  rpcUrl: process.env.RPC_MAINNET,
  explorer: 'https://etherscan.io',
  addressesNames: {
    '0xCA76Ebd8617a03126B6FB84F9b1c1A0fB71C2633': 'Aave Guardian Ethereum',
    // ...
  },
  pools: {
    [Pools.V3]: {
      // ...
    }
  }
};
```

### 2.2 Hardcoded Addresses in Code

**Problem**: Some addresses are hardcoded directly in TypeScript files instead of coming from config:
```typescript
// ghoPermissions.ts:279 - address buried in code
const ghoStewardContract = getContract({
  address: getAddress('0x8F2411a538381aae2b464499005F0211e867d84f'), // Hardcoded!
  ...
});

// ghoPermissions.ts:365 - another hardcoded comparison
if (getAddress(proxyAdmin) !== getAddress('0xd3cf979e676265e4f6379749dece4708b9a22476')) {
```

**Why this is problematic**:
- Hard to find all addresses when auditing or updating
- No single source of truth
- Easy to miss when contracts are upgraded/redeployed
- Inconsistent with the pattern used elsewhere

**Current config structure**:
- `addressBook` / `ppcAddressBook` / `governanceAddressBook` / `umbrellaAddressBook`: Contract addresses we need to query permissions from
- `addresses`: Name mappings for display purposes (e.g., `'0x123': 'LayerZeroAdapter'`)
- `addressesNames` (at network level): Global name mappings for known addresses

**Solution**: Move hardcoded addresses to the appropriate `*AddressBook` object in the pool config:

```typescript
// Before (hardcoded in ghoPermissions.ts):
const ghoStewardContract = getContract({
  address: getAddress('0x8F2411a538381aae2b464499005F0211e867d84f'),
  ...
});

// After - add to addressBook in config:
[Pools.GHO]: {
  addressBook: {
    ...AaveV3Ethereum,
    ...MiscEthereum,
    ...GhoEthereum,
    GHO_STEWARD_V2: '0x8F2411a538381aae2b464499005F0211e867d84f',  // Add here
  },
  // ...
}

// Then in ghoPermissions.ts:
const ghoStewardContract = getContract({
  address: getAddress(addressBook.GHO_STEWARD_V2),
  ...
});
```

**For addresses used in comparisons** (like the Aave proxy admin check), add them to `addressesNames` at network level for clarity:

```typescript
addressesNames: {
  '0xd3cf979e676265e4f6379749dece4708b9a22476': 'Aave Proxy Admin',
  // ...
}
```

**Benefits**:
- Follows existing patterns in the codebase
- All queryable addresses in `*AddressBook` objects
- Consistent with how other contracts are referenced
- Easy to audit by checking pool configs

---

## 3. Block Number Metadata Separation (High Priority)

> **Note**: This section is **superseded by Section 13 (Unified Event Indexing)** which achieves the same goals plus additional benefits. Section 13 reduces 8+ block numbers to 1 per network, handles metadata separation, AND reduces RPC calls by 8x. Implement Section 13 instead of this section.

### 3.1 The Problem: Git Conflicts from CI Updates

**Current behavior**: The `out/permissions/{chainId}-permissions.json` files store `latestBlockNumber` mixed throughout the permission data structure:

```json
{
  "V3": {
    "contracts": { ... },
    "roles": {
      "role": {
        "POOL_ADMIN": ["0x..."],
        "RISK_ADMIN": ["0x..."]
      },
      "latestBlockNumber": 24373016    // <-- Changes every CI run
    },
    "govV3": {
      "contracts": { ... },
      "latestCCCBlockNumber": 24373017, // <-- Changes every CI run
      "ggRoles": {
        "role": { ... },
        "latestBlockNumber": 24373017   // <-- Changes every CI run
      }
    },
    "collector": {
      "cRoles": {
        "role": { ... },
        "latestBlockNumber": 24373017   // <-- Changes every CI run
      }
    },
    "umbrella": {
      "umbrellaRoles": {
        "latestBlockNumber": 24373017   // <-- Changes every CI run
      },
      "umbrellaIncentivesRoles": {
        "latestBlockNumber": 24373017   // <-- Changes every CI run
      }
    }
  }
}
```

**The conflict scenario**:
1. CI runs on `main` branch, updates all `latestBlockNumber` values to block X
2. You're working on `feature-branch`, run locally, block numbers update to block Y
3. When merging/rebasing: **conflicts in every permissions JSON file**

These conflicts are tedious because:
- They're in large JSON files
- Many `latestBlockNumber` fields scattered throughout
- The actual permission changes (what you care about) get buried in block number noise

### 3.2 Solution: Separate Metadata File Per Network

**Proposal**: Extract all `latestBlockNumber` values into a separate metadata file for each network:

**New structure**:
```
out/
├── permissions/
│   ├── 1-permissions.json      # Permission data only (no block numbers)
│   ├── 1-metadata.json         # Block numbers only (NEW)
│   ├── 137-permissions.json
│   ├── 137-metadata.json
│   ├── 42161-permissions.json
│   ├── 42161-metadata.json
│   └── ...
```

**1-permissions.json** (cleaned - no block numbers):
```json
{
  "V3": {
    "contracts": { ... },
    "roles": {
      "role": {
        "POOL_ADMIN": ["0x..."],
        "RISK_ADMIN": ["0x..."]
      }
    },
    "govV3": {
      "contracts": { ... },
      "senders": [...],
      "ggRoles": {
        "role": { ... }
      }
    }
  }
}
```

**1-metadata.json** (new file - only block numbers):
```json
{
  "V3": {
    "roles": { "latestBlockNumber": 24373016 },
    "govV3": {
      "latestCCCBlockNumber": 24373017,
      "ggRoles": { "latestBlockNumber": 24373017 }
    },
    "collector": {
      "cRoles": { "latestBlockNumber": 24373017 }
    },
    "clinicSteward": {
      "clinicStewardRoles": { "latestBlockNumber": 24373017 }
    },
    "umbrella": {
      "umbrellaRoles": { "latestBlockNumber": 24373017 },
      "umbrellaIncentivesRoles": { "latestBlockNumber": 24373017 }
    }
  },
  "GHO": {
    "roles": { "latestBlockNumber": 23040127 }
  }
}
```

### 3.3 Benefits

| Benefit | Impact |
|---------|--------|
| **Cleaner diffs** | PRs show actual permission changes, not block noise |
| **Fewer conflicts** | Metadata file changes don't conflict with permission changes |
| **Isolated updates** | Network X metadata conflict doesn't affect network Y |
| **Easier reviews** | Can `.gitignore` metadata files if desired |
| **Same functionality** | Block tracking still works exactly as before |

### 3.4 Implementation

**Changes to `helpers/fileSystem.ts`**:
```typescript
// New types
type NetworkMetadata = Record<string, PoolMetadata>;
type PoolMetadata = {
  roles?: { latestBlockNumber: number };
  govV3?: {
    latestCCCBlockNumber?: number;
    ggRoles?: { latestBlockNumber: number };
  };
  collector?: { cRoles?: { latestBlockNumber: number } };
  // etc.
};

// New functions
export const getMetadataByNetwork = (network: string): NetworkMetadata => {
  const path = `./out/permissions/${network}-metadata.json`;
  if (!fs.existsSync(path)) return {};
  return JSON.parse(fs.readFileSync(path, 'utf-8'));
};

export const saveMetadata = (network: string, metadata: NetworkMetadata): void => {
  const path = `./out/permissions/${network}-metadata.json`;
  fs.writeFileSync(path, JSON.stringify(metadata, null, 2));
};

// Modify existing to merge metadata back when reading (for backward compat)
export const getPermissionsByNetwork = (network: string): FullPermissions => {
  const permissions = JSON.parse(fs.readFileSync(...));
  const metadata = getMetadataByNetwork(network);
  return mergeMetadataIntoPermissions(permissions, metadata);
};
```

**Changes to `scripts/modifiersCalculator.ts`**:
```typescript
// At the end of generateNetworkPermissions:

// Extract metadata before saving
const { permissionsOnly, metadata } = separateMetadata(fullJson);

// Save separately
saveJson(`out/permissions/${network}-permissions.json`, JSON.stringify(permissionsOnly, null, 2));
saveMetadata(network, metadata);
```

**Helper function to extract metadata**:
```typescript
const separateMetadata = (fullJson: FullPermissions) => {
  const metadata: NetworkMetadata = {};
  const permissionsOnly = JSON.parse(JSON.stringify(fullJson)); // Deep clone

  for (const [poolKey, poolData] of Object.entries(permissionsOnly)) {
    metadata[poolKey] = {};

    // Extract roles.latestBlockNumber
    if (poolData.roles?.latestBlockNumber) {
      metadata[poolKey].roles = { latestBlockNumber: poolData.roles.latestBlockNumber };
      delete permissionsOnly[poolKey].roles.latestBlockNumber;
    }

    // Extract govV3 block numbers
    if (poolData.govV3?.latestCCCBlockNumber) {
      metadata[poolKey].govV3 = metadata[poolKey].govV3 || {};
      metadata[poolKey].govV3.latestCCCBlockNumber = poolData.govV3.latestCCCBlockNumber;
      delete permissionsOnly[poolKey].govV3.latestCCCBlockNumber;
    }

    // ... similar for collector.cRoles, umbrella, etc.
  }

  return { permissionsOnly, metadata };
};
```

### 3.5 Migration Strategy

1. **Phase 1**: Add metadata extraction/merging functions (backward compatible - reads from both)
2. **Phase 2**: Start writing separate metadata files
3. **Phase 3**: Remove block numbers from permissions files
4. **Optional**: Add `*-metadata.json` to `.gitignore` if you don't need block number changes tracked in git

---

## 4. Architecture Improvements (Medium Priority)

### 4.1 Permission Resolver Interface

**Problem**: `modifiersCalculator.ts` has a massive function (600+ lines) with complex nested conditionals determining which resolver to call:

```typescript
if (poolKey === Pools.GOV_V2 || poolKey === Pools.GOV_V2_TENDERLY) {
  // ...
} else if (poolKey === Pools.SAFETY_MODULE || poolKey === Pools.SAFETY_MODULE_TENDERLY) {
  // ...
} else if (poolKey === Pools.V2_MISC || poolKey === Pools.V2_MISC_TENDERLY) {
  // ...
} // ... many more conditions
```

**Solution**: Create a unified permission resolver interface with a factory:

```typescript
// interfaces/PermissionResolver.ts
export interface PermissionResolver {
  resolve(
    addressBook: any,
    provider: Client,
    permissionsJson: PermissionsJson,
    context: ResolverContext
  ): Promise<Contracts>;
}

// Factory pattern
export class PermissionResolverFactory {
  private static resolvers = new Map<string, () => PermissionResolver>([
    [Pools.V3, () => new V3PermissionResolver()],
    [Pools.V2, () => new V2PermissionResolver()],
    [Pools.GHO, () => new GhoPermissionResolver()],
    // ...
  ]);

  static getResolver(pool: Pools): PermissionResolver {
    const factory = this.resolvers.get(pool);
    if (!factory) throw new Error(`No resolver for pool: ${pool}`);
    return factory();
  }
}
```

> **Note**: Table generation duplication is covered in detail in Section 11.

---

## 5. Type Safety (Medium Priority)

### 5.1 Eliminate `any` Types

**Problem**: Heavy use of `any` throughout:
```typescript
addressBook: any,  // In every permission function
pool.addressBook,  // No type safety
```

**Solution**: Create proper types for address books:

```typescript
// types/addressBook.ts
export interface BaseAddressBook {
  POOL?: Address;
  POOL_ADDRESSES_PROVIDER?: Address;
  POOL_CONFIGURATOR?: Address;
  ACL_MANAGER?: Address;
  COLLECTOR?: Address;
  // ... common addresses
}

export interface V3AddressBook extends BaseAddressBook {
  EMISSION_MANAGER: Address;
  DEFAULT_INCENTIVES_CONTROLLER: Address;
  // V3-specific
}

export interface GovernanceAddressBook {
  CROSS_CHAIN_CONTROLLER?: Address;
  PAYLOADS_CONTROLLER?: Address;
  // ...
}
```

### 5.2 Remove @ts-ignore Comments

**Problem**: Several `@ts-ignore` comments suppress real type issues:
```typescript
// @ts-ignore
Object.keys(fullJson[poolKey].gsmRoles).length > 0
```

**Solution**: Fix the underlying type definitions so proper type checking works.

---

## 6. Error Handling & Logging (Medium Priority)

### 6.1 Empty Catch Blocks

**Problem**:
```typescript
// ghoPermissions.ts:383-385
} catch (error) {
  // do nothing
}
```

**Solution**: Implement proper error handling with logging:

```typescript
// helpers/logger.ts
export const logger = {
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, context);
  },
  error: (message: string, error: unknown, context?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, { error, ...context });
  },
  info: (message: string, context?: Record<string, unknown>) => {
    if (process.env.VERBOSE) console.log(`[INFO] ${message}`, context);
  }
};

// Usage
} catch (error) {
  logger.warn('Could not resolve facilitator owner', {
    facilitator,
    error: error instanceof Error ? error.message : String(error)
  });
}
```

### 6.2 Console.log Cleanup

**Problem**: Debug console.log statements scattered throughout:
```typescript
console.log(`EdgeInjectorRates guardian not found for network: ${chainId}`);
```

**Solution**: Replace with structured logger and add verbosity levels.

---

## 7. Code Quality (Low Priority)

### 7.1 Remove Dead Code

**Problem**: Commented-out code blocks in multiple files:
```typescript
// [Pools.GHO_TENDERLY]: {
//   permissionsJson: './statics/functionsPermissionsGHO.json',
//   ...
// },
```

**Solution**: Remove all commented-out configurations. Use git history for reference.

### 7.2 Add JSDoc Documentation

**Problem**: No documentation for public functions.

**Solution**: Add JSDoc comments:

```typescript
/**
 * Resolves V3 pool permission modifiers by querying the blockchain
 * and building a contracts permission map.
 *
 * @param addressBook - Contract addresses for the pool
 * @param provider - RPC client for blockchain queries
 * @param permissionsObject - Static function permissions from JSON
 * @param pool - Pool type identifier
 * @param chainId - Network chain ID
 * @param adminRoles - Role-to-address mapping from ACL events
 * @returns Contracts permission map
 */
export const resolveV3Modifiers = async (
  addressBook: V3AddressBook,
  provider: Client,
  permissionsObject: PermissionsJson,
  pool: Pools,
  chainId: ChainId,
  adminRoles: Record<string, string[]>,
): Promise<Contracts> => {
```

---

## 8. Performance Optimizations (Low Priority)

> **Note**: Safe owner query caching is covered in Section 1.2 (OwnerResolver class).

### 8.1 Parallel Permission Resolution

**Problem**: Networks are processed in parallel but pools within a network are sequential.

**Solution**: Consider parallel pool processing where there are no dependencies.

---

## 9. Testing (Low Priority)

**Problem**: No tests visible in the codebase.

**Solution**: Add basic test coverage:

```typescript
// __tests__/helpers/addressUtils.test.ts
describe('uniqueAddresses', () => {
  it('should remove duplicate addresses', () => {
    const input = [
      { address: '0x123', owners: [] },
      { address: '0x123', owners: ['0xabc'] },
      { address: '0x456', owners: [] },
    ];
    const result = uniqueAddresses(input);
    expect(result).toHaveLength(2);
  });
});
```

---

## Implementation Order

> **Key Changes from Initial Plan:**
> - Removed separate "Block Number Separation" phase - superseded by Unified Event Indexing
> - Moved Unified Event Indexing earlier (High Priority impact)
> - Combined modifiersCalculator patterns WITH unified indexing (they're interdependent)
> - Moved Configuration split AFTER unified indexing (config structure changes significantly)

### Phase 1: Foundation (No Risk)
1. Extract duplicated helper functions to `helpers/addressUtils.ts`
2. Create `OwnerResolver` class with caching
3. Add proper logger utility

### Phase 2: Permission Scripts Cleanup (Low Risk)
> Uses the OwnerResolver from Phase 1; reduces ~640 lines

4. Create `resolveOwnableContract()` helper in `helpers/contractResolvers.ts`
5. Create `mapRoleAddresses()` helper
6. Refactor Edge Steward patterns to use loop
7. Simplify `limits.ts` (remove useless if/else chain)
8. Update all permission scripts to use new helpers

### Phase 3: Decentralization Logic (Low Risk)
9. Extract `isSteward()` helper function
10. Create `classifyController()` helper to flatten nested logic
11. Merge `isOwnedAndByWho` and `isAdministeredAndByWho` into parameterized function
12. Replace forEach mutations with for...of and early returns
13. Move hardcoded addresses/names to `statics/decentralizationConfig.json`

### Phase 4: Unified Event Indexing (Medium Risk - HIGH IMPACT)
> This is the most impactful change: ~8x fewer RPC calls, single block number per network

14. Extract `isTenderlyPool()` and `getProviderForPool()` helpers (from Section 12)
15. Extract logging helper for consistent formatting (from Section 12)
16. Create `UnifiedEventIndexer` class in `helpers/eventIndexer.ts`
17. Add metadata file functions to `helpers/fileSystem.ts`
18. Update `adminRoles.ts` to work with pre-fetched events (pure function)
19. Update `crossChainControllerLogs.ts` to work with pre-fetched events
20. Refactor `modifiersCalculator.ts` to use unified indexer
21. Migrate to single `{chainId}-metadata.json` per network
22. Handle Tenderly fork edge case in indexer

### Phase 5: Table Generation Refactoring (Low Risk)
23. Create `generateContractTable()` helper in `helpers/tableGenerator.ts`
24. Create `generateRoleTable()` helper
25. Refactor `generateTableAddress()` to flatten nested ternaries
26. Replace 5 contract table blocks with generic generator
27. Replace 6 admin table blocks with generic generator
28. Configuration-driven contract aggregation for v3Contracts

### Phase 6: Configuration Split (Low Risk)
> Done AFTER unified indexing because config structure includes new `eventContracts` pattern

29. Split `configs.ts` into modular files
30. Add `eventContracts` config pattern (from unified indexing)
31. Move hardcoded addresses to appropriate `*AddressBook` objects
32. Remove dead/commented code

### Phase 7: Architecture (Medium Risk)
33. Create permission resolver interface
34. Implement factory pattern for resolvers

### Phase 8: Type Safety (Low Risk)
35. Create proper address book types
36. Fix @ts-ignore instances
37. Add JSDoc documentation

### Phase 9: Quality & Testing (Low Risk)
38. Add basic unit tests
39. Performance optimizations (parallel pool processing)

---

## Files to Create/Modify

### New Files
- `helpers/addressUtils.ts` - Shared address utilities (`uniqueAddresses`, `getAddressInfo`)
- `helpers/ownerResolver.ts` - Cached owner resolution
- `helpers/contractResolvers.ts` - Generic contract resolution helpers (`resolveOwnableContract`, `mapRoleAddresses`)
- `helpers/eventIndexer.ts` - Unified event indexing across all contracts
- `helpers/logger.ts` - Structured logging
- `helpers/tableGenerator.ts` - Generic table generation
- `helpers/configs/index.ts` - Config aggregation
- `helpers/configs/pools.ts` - Pool enum
- `helpers/configs/roles.ts` - Role constants
- `helpers/configs/networks/*.ts` - Per-network configs
- `statics/decentralizationConfig.json` - Hardcoded values extracted from decentralization logic
- `types/addressBook.ts` - Address book types
- `interfaces/PermissionResolver.ts` - Resolver interface

### Modified Files
- `helpers/fileSystem.ts` - Add metadata file functions
- `helpers/decentralization.ts` - Refactor with helper functions, flatten nesting, merge duplicates
- `helpers/adminRoles.ts` - Refactor to accept pre-fetched events (pure function)
- `helpers/crossChainControllerLogs.ts` - Refactor to accept pre-fetched events
- `helpers/limits.ts` - Simplify to single return with optional overrides
- `helpers/tables.ts` - Cleaner string building with join()
- `helpers/explorer.ts` - Better null handling
- `helpers/configs.ts` - Add `eventContracts` config pattern (then split into modular files)
- `scripts/modifiersCalculator.ts` - Use unified indexer, extract Tenderly helpers, save metadata separately
- `scripts/createTables.ts` - Use table generators (~570 lines reduced), flatten generateTableAddress
- `scripts/v3Permissions.ts` - Remove duplicates, use shared utils and OwnerResolver
- `scripts/ghoPermissions.ts` - Remove duplicates, use addressBook for addresses
- `scripts/collectorPermissions.ts` - Remove duplicates, use shared utils
- `scripts/govV3Permissions.ts` - Remove duplicates, use shared utils
- `scripts/umbrellaPermissions.ts` - Remove duplicates, use shared utils
- `scripts/ppcPermissions.ts` - Remove duplicates, use shared utils
- `scripts/clinicStewardPermissions.ts` - Remove duplicates, use shared utils
- `scripts/v2Permissions.ts` - Remove duplicates, use shared utils
- `scripts/safetyPermissions.ts` - Remove duplicates, use shared utils
- `helpers/types.ts` - Expand type definitions, add metadata types

### New Output Files (generated)
- `out/permissions/{chainId}-metadata.json` - Block number metadata per network

---

## Validation Strategy

After each change:
1. Run `npm run modifiers:generate` to generate permissions JSON
2. Run `npm run tables:create` to generate markdown tables
3. Use `git diff out/` to verify no changes to output files
4. If outputs differ, rollback and investigate

---

## 10. Decentralization Logic Refactoring (High Priority)

### 10.1 The Problem: Deeply Nested and Confusing Logic

The `helpers/decentralization.ts` file contains some of the most confusing code in the codebase. The main issues:

**`getActionExecutors` function (78 lines, 6-7 levels of nesting)**:
```typescript
// Current code - extremely hard to follow
modifier.addresses.map((addressInfo) => {
  const addressName = addressesNames[addressInfo.address];
  if (addressName && (addressName.toLowerCase().includes('steward') || addressName.toLowerCase().includes('agrs'))) {
    actionsObject[action].add(Controller.STEWARD);
  } else {
    if (addressInfo.owners.length > 0) {
      if (contractName.toLowerCase().includes('steward') || contractName.toLowerCase().includes('agrs')) {
        actionsObject[action].add(Controller.STEWARD);
      } else {
        actionsObject[action].add(Controller.MULTI_SIG);
      }
    } else {
      const addressInPoolInfo = Object.keys(poolInfo).find((poolInfoContractName) => poolInfo[poolInfoContractName].address.toLowerCase() === addressInfo.address.toLowerCase());
      if (addressInPoolInfo && (addressInPoolInfo.toLowerCase().includes('steward') || addressInPoolInfo.toLowerCase().includes('agrs'))) {
        actionsObject[action].add(Controller.STEWARD);
      } else {
        const ownedInfo = isAdministeredAndByWho(...);
        if (ownedInfo.owned) {
          if (ownedInfo.ownedByAddress) {
            // ... more nesting
          }
        }
      }
    }
  }
});
```

**Problems identified**:

| Issue | Occurrences | Impact |
|-------|-------------|--------|
| Repeated "steward"/"agrs" check | 6 times | Hard to maintain, easy to miss one |
| Deep nesting (6-7 levels) | Throughout | Very hard to follow control flow |
| `isOwnedAndByWho` vs `isAdministeredAndByWho` duplication | 2 functions | ~90 lines of near-identical code |
| Hardcoded addresses in logic | 2 places | Maintenance burden |
| `forEach` with outer variable mutation | 3 places | Confusing control flow |
| No early returns | Throughout | Excessive nesting |
| Missing JSDoc | All functions | No explanation of algorithm |

### 10.2 Solution: Extract Helper Functions and Flatten Logic

**Step 1: Create a steward detection helper**

```typescript
// helpers/decentralization.ts

/**
 * Checks if an address or contract name represents a steward.
 * Stewards are special risk management contracts that can execute
 * certain actions on behalf of governance.
 */
const isSteward = (name: string | undefined): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('steward') || lower.includes('agrs');
};
```

**Step 2: Create a controller classification helper**

```typescript
interface ControllerClassificationContext {
  addressInfo: AddressInfo;
  contractName: string;
  poolInfo: Contracts;
  govInfo: Contracts;
  addressesNames: Record<string, string>;
  isWhiteLabel: boolean;
}

/**
 * Determines what type of controller owns/administers an address.
 * This is the core classification logic extracted from the nested conditionals.
 *
 * Classification priority:
 * 1. If address name contains "steward"/"agrs" → STEWARD
 * 2. If address is a multisig (has owners) → MULTI_SIG or STEWARD (if contract is steward)
 * 3. If address is a known contract in poolInfo that's a steward → STEWARD
 * 4. Otherwise, check ownership chain via isAdministeredAndByWho
 */
const classifyController = (ctx: ControllerClassificationContext): Controller => {
  const { addressInfo, contractName, poolInfo, govInfo, addressesNames, isWhiteLabel } = ctx;
  const addressName = addressesNames[addressInfo.address];

  // 1. Check if address name indicates steward
  if (isSteward(addressName)) {
    return Controller.STEWARD;
  }

  // 2. Check if it's a multisig
  if (addressInfo.owners.length > 0) {
    return isSteward(contractName) ? Controller.STEWARD : Controller.MULTI_SIG;
  }

  // 3. Check if address is a known steward contract in poolInfo
  const matchingContract = Object.entries(poolInfo).find(
    ([_, contract]) => contract.address?.toLowerCase() === addressInfo.address.toLowerCase()
  );
  if (matchingContract && isSteward(matchingContract[0])) {
    return Controller.STEWARD;
  }

  // 4. Check ownership chain
  const ownedInfo = isAdministeredAndByWho(addressInfo.address, poolInfo, govInfo, isWhiteLabel);

  if (!ownedInfo.owned) {
    // Not owned by known entity - check if contract itself is steward
    if (isSteward(contractName) || isSteward(addressesNames[addressInfo.address])) {
      return Controller.STEWARD;
    }
    return Controller.EOA;
  }

  // Check if the owner is a steward
  if (ownedInfo.ownedByAddress && isSteward(addressesNames[ownedInfo.ownedByAddress])) {
    return Controller.STEWARD;
  }

  return ownedInfo.ownedBy;
};
```

**Step 3: Simplify `getActionExecutors` using the helpers**

```typescript
/**
 * Determines which controllers can execute each action type.
 *
 * For each action defined in actionsConfig.json, this function:
 * 1. Finds all contracts that have functions matching the action
 * 2. Identifies who can call those functions (via modifiers)
 * 3. Classifies each caller as GOV_V3, MULTI_SIG, STEWARD, PPC_MULTI_SIG, or EOA
 *
 * @returns Record mapping action names to Sets of Controller types
 */
export const getActionExecutors = (
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
  addressesNames: Record<string, string>
): Record<string, Set<Controller>> => {
  const actionsObject: Record<string, Set<Controller>> = {};

  // Actions that are always controlled by governance (not stewards)
  const governanceOnlyActions = new Set([
    'updateReserveBorrowSettings',
    'configureCollateral',
    'updateReserveSettings',
    'reserveUpgradeability',
    'configureProtocolFees',
  ]);

  for (const action of Object.keys(actionsConfig)) {
    actionsObject[action] = new Set<Controller>();

    for (const [contractName, contract] of Object.entries(poolInfo)) {
      for (const modifier of contract.modifiers) {
        const hasMatchingFunction = modifier.functions.some(
          (fn: string) => (actionsConfig as Record<string, string[]>)[action]?.includes(fn)
        );

        if (!hasMatchingFunction) continue;

        // Governance-only actions skip steward classification
        if (governanceOnlyActions.has(action)) {
          actionsObject[action].add(isWhiteLabel ? Controller.PPC_MULTI_SIG : Controller.GOV_V3);
          continue;
        }

        // Classify each address that can call this modifier
        for (const addressInfo of modifier.addresses) {
          const controller = classifyController({
            addressInfo,
            contractName,
            poolInfo,
            govInfo,
            addressesNames,
            isWhiteLabel,
          });
          actionsObject[action].add(controller);
        }
      }
    }
  }

  return actionsObject;
};
```

### 10.3 Merge Duplicate Ownership Functions

**Problem**: `isOwnedAndByWho` (lines 176-221) and `isAdministeredAndByWho` (lines 223-272) are nearly identical, differing only in which modifiers they check.

**Current duplicate code**:
```typescript
// isOwnedAndByWho checks: onlyOwner
// isAdministeredAndByWho checks: onlyOwner, onlyEthereumGovernanceExecutor, onlyRiskCouncil (except GhoStewardV2), onlyEmergencyAdmin, onlyDefaultAdmin
```

**Solution**: Create a single parameterized function:

```typescript
type OwnershipCheckMode = 'strict' | 'administered';

const STRICT_MODIFIERS = ['onlyOwner'];
const ADMINISTERED_MODIFIERS = [
  'onlyOwner',
  'onlyEthereumGovernanceExecutor',
  'onlyRiskCouncil',
  'onlyEmergencyAdmin',
  'onlyDefaultAdmin',
];

interface OwnershipResult {
  owned: boolean;
  ownedBy: Controller;
  ownedByAddress?: string;
}

/**
 * Determines if an address is owned/administered and by whom.
 *
 * @param mode - 'strict' checks only onlyOwner, 'administered' checks multiple admin modifiers
 */
const checkOwnership = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean,
  mode: OwnershipCheckMode,
  contractNameFilter?: string, // For GhoStewardV2 special case
): OwnershipResult => {
  // Hardcoded special case (should move to config)
  if (address.toLowerCase() === '0xf02d4931e0d5c79af9094cd9dff16ea6e3d9acb8'.toLowerCase()) {
    return { owned: true, ownedBy: Controller.GOV_V3 };
  }

  const modifiersToCheck = mode === 'strict' ? STRICT_MODIFIERS : ADMINISTERED_MODIFIERS;

  for (const [contractName, contract] of Object.entries(poolInfo)) {
    if (contract.address?.toLowerCase() !== address.toLowerCase()) continue;

    // If has proxy admin, recurse to check proxy admin ownership
    if (contract.proxyAdmin) {
      return checkOwnership(contract.proxyAdmin, poolInfo, govInfo, isWhiteLabel, 'strict');
    }

    for (const modifierInfo of contract.modifiers) {
      // Skip onlyRiskCouncil for GhoStewardV2 (special case)
      if (
        modifierInfo.modifier === 'onlyRiskCouncil' &&
        contractName === 'GhoStewardV2'
      ) {
        continue;
      }

      if (!modifiersToCheck.includes(modifierInfo.modifier)) continue;

      const primaryAddress = modifierInfo.addresses[0];

      // Has multisig owners
      if (primaryAddress.owners.length > 0) {
        return { owned: true, ownedBy: Controller.MULTI_SIG };
      }

      // Check if owned by governance
      const ownedByGov = isOwnedByGov(
        primaryAddress.address,
        govInfo,
        primaryAddress.address
      );

      if (ownedByGov) {
        return {
          owned: true,
          ownedBy: isWhiteLabel ? Controller.PPC_MULTI_SIG : Controller.GOV_V3,
        };
      }

      return {
        owned: true,
        ownedBy: Controller.EOA,
        ownedByAddress: primaryAddress.address,
      };
    }
  }

  return { owned: false, ownedBy: Controller.EOA };
};

// Convenience wrappers for backward compatibility
export const isOwnedAndByWho = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean
) => checkOwnership(address, poolInfo, govInfo, isWhiteLabel, 'strict');

export const isAdministeredAndByWho = (
  address: string,
  poolInfo: Contracts,
  govInfo: Contracts,
  isWhiteLabel: boolean
) => checkOwnership(address, poolInfo, govInfo, isWhiteLabel, 'administered');
```

### 10.4 Fix forEach Mutation Anti-pattern

**Problem**: Using `forEach` while mutating an outer variable makes control flow confusing:

```typescript
// Current - hard to follow
let ownerFound = false;
contract.modifiers.forEach((modifierInfo) => {
  if (...) {
    ownerFound = true;  // Mutation inside forEach!
  }
});
return ownerFound;
```

**Solution**: Use `for...of` with early returns:

```typescript
// Better - clear control flow
for (const modifierInfo of contract.modifiers) {
  if (modifierInfo.modifier === 'onlyOwner') {
    if (modifierInfo.addresses[0].owners.length > 0) {
      return false;
    }
    // Check governance ownership
    const isGovOwned = isOwnedByGov(
      modifierInfo.addresses[0].address,
      govInfo,
      initialAddress
    );
    if (isGovOwned) return true;
  }
}
return false;
```

### 10.5 Move Hardcoded Values to Configuration

**Problem**: Hardcoded addresses and contract names in the logic:

```typescript
// Line 183 - hardcoded address
if (address.toLowerCase() === ('0xf02d4931e0d5c79af9094cd9dff16ea6e3d9acb8').toLowerCase()) {
  return { owned: true, ownedBy: Controller.GOV_V3 };
}

// Line 242 - hardcoded contract name exception
(modifierInfo.modifier === 'onlyRiskCouncil' && contractName !== 'GhoStewardV2')
```

**Solution**: Move to configuration:

```typescript
// Add to statics/decentralizationConfig.json
{
  "knownGovernanceOwnedAddresses": [
    {
      "address": "0xf02d4931e0d5c79af9094cd9dff16ea6e3d9acb8",
      "comment": "GHO facilitator double proxy - can be removed after facilitator change"
    }
  ],
  "riskCouncilExceptions": ["GhoStewardV2"],
  "stewardIndicators": ["steward", "agrs"]
}
```

### 10.6 Implementation Summary

| Change | Lines Reduced | Complexity Reduction |
|--------|---------------|---------------------|
| Extract `isSteward()` helper | -30 lines | 6 checks → 1 function |
| Extract `classifyController()` | -40 lines | Flattens 7 levels to 2 |
| Merge ownership functions | -50 lines | 2 functions → 1 parameterized |
| Fix forEach mutations | Same | Much clearer control flow |
| Move hardcodes to config | Same | Easier maintenance |

**Estimated total reduction**: ~120 lines while significantly improving readability.

---

## 11. Table Generation Refactoring (High Priority)

### 11.1 The Problem: Massive Code Duplication in createTables.ts

The `scripts/createTables.ts` file (1166 lines) contains extreme code duplication:

**5 nearly identical contract table blocks** (~350 lines duplicated):
- Contracts table (lines 407-496)
- Governance V3 Contracts table (lines 498-588)
- Umbrella Contracts table (lines 590-682)
- Risk Agent Contracts (agentHub) table (lines 684-773)
- PPC Contracts table (lines 775-867)

Each block follows this exact pattern:
```typescript
if (poolPermitsByContract.XXX && ...) {
  let xxxTable = `### XXX Contracts \n`;
  const xxxHeaderTitles = ['contract', 'proxyAdmin', 'modifier', 'permission owner', 'functions'];
  const xxxHeader = getTableHeader(xxxHeaderTitles);
  xxxTable += xxxHeader;

  let xxxTableBody = '';
  for (let contractName of Object.keys(poolPermitsByContract.XXX.contracts)) {
    const contract = poolPermitsByContract.XXX.contracts[contractName];

    if (contract.modifiers.length === 0) {
      xxxTableBody += getTableBody([...]);
      xxxTableBody += getLineSeparator(...);
    }
    for (let modifier of contract.modifiers) {
      for (let modifierAddress of modifier.addresses) {
        if (!poolGuardians[modifierAddress.address]) {
          if (modifierAddress.owners.length > 0) {
            poolGuardians[modifierAddress.address] = {...};
          }
        }
      }
      xxxTableBody += getTableBody([...]);
      xxxTableBody += getLineSeparator(...);
    }
  }
  xxxTable += xxxTableBody;
  readmeByNetwork += xxxTable + '\n';
}
```

**6 nearly identical admin/role tables** (~200 lines duplicated):
- Admins table (lines 895-925)
- Granular Guardian Admins table (lines 927-959)
- Umbrella Admins table (lines 961-996)
- Collector Admins table (lines 998-1030)
- Clinic Steward Admins table (lines 1032-1064)
- GSM Admins tables (lines 1067-1101)

### 11.2 Solution: Generic Table Generators

**Step 1: Create a contract table generator**

```typescript
// helpers/tableGenerator.ts

interface ContractTableConfig {
  title: string;
  contracts: Contracts | undefined;
}

interface TableContext {
  network: string;
  addressesNames: Record<string, string>;
  contractsByAddress: ContractsByAddress;
  poolGuardians: PoolGuardians; // Mutated by this function
}

/**
 * Generates a markdown table for a set of contracts.
 * This single function replaces 5 nearly identical code blocks.
 */
export const generateContractTable = (
  config: ContractTableConfig,
  ctx: TableContext
): string => {
  if (!config.contracts || Object.keys(config.contracts).length === 0) {
    return '';
  }

  const headerTitles = ['contract', 'proxyAdmin', 'modifier', 'permission owner', 'functions'];
  let table = `### ${config.title}\n`;
  table += getTableHeader(headerTitles);

  for (const [contractName, contract] of Object.entries(config.contracts)) {
    // Handle contracts with no modifiers
    if (contract.modifiers.length === 0) {
      table += getTableBody([
        `[${contractName}](${explorerAddressUrlComposer(contract.address, ctx.network)})`,
        generateTableAddress(contract.proxyAdmin, ctx.addressesNames, ctx.contractsByAddress, ctx.poolGuardians, ctx.network),
        '-', '-', '-'
      ]);
      table += getLineSeparator(headerTitles.length);
      continue;
    }

    // Process each modifier
    for (const modifier of contract.modifiers) {
      // Update poolGuardians (side effect for Guardians table)
      for (const addr of modifier.addresses) {
        if (!ctx.poolGuardians[addr.address] && addr.owners.length > 0) {
          ctx.poolGuardians[addr.address] = {
            owners: addr.owners,
            threshold: addr.signersThreshold,
          };
        }
      }

      table += getTableBody([
        `[${contractName}](${explorerAddressUrlComposer(contract.address, ctx.network)})`,
        generateTableAddress(contract.proxyAdmin, ctx.addressesNames, ctx.contractsByAddress, ctx.poolGuardians, ctx.network),
        modifier.modifier,
        modifier.addresses.map(a => generateTableAddress(a.address, ctx.addressesNames, ctx.contractsByAddress, ctx.poolGuardians, ctx.network, a.chain)).join(', '),
        modifier?.functions?.join(', ') || ''
      ]);
      table += getLineSeparator(headerTitles.length);
    }
  }

  return table + '\n';
};
```

**Step 2: Create a role/admin table generator**

```typescript
interface RoleTableConfig {
  title: string;
  roles: Record<string, string[]> | undefined;
}

/**
 * Generates a markdown table for roles/admins.
 * This single function replaces 6 nearly identical code blocks.
 */
export const generateRoleTable = (
  config: RoleTableConfig,
  ctx: TableContext
): string => {
  if (!config.roles || Object.keys(config.roles).length === 0) {
    return '';
  }

  const headerTitles = ['Role', 'Contract'];
  let table = `### ${config.title}\n`;
  table += getTableHeader(headerTitles);

  for (const [role, addresses] of Object.entries(config.roles)) {
    table += getTableBody([
      role,
      addresses.map(addr =>
        generateTableAddress(addr, ctx.addressesNames, ctx.contractsByAddress, ctx.poolGuardians, ctx.network)
      ).join(', ')
    ]);
    table += getLineSeparator(headerTitles.length);
  }

  return table + '\n';
};
```

**Step 3: Refactor generateTable to use the helpers**

```typescript
// Before: ~550 lines of duplicated table generation
// After: ~100 lines using the generic generators

export const generateTable = (network: string, pool: string): string => {
  // ... setup code ...

  const tableCtx: TableContext = {
    network,
    addressesNames,
    contractsByAddress,
    poolGuardians,
  };

  // Contract tables - each was ~90 lines, now 4 lines each
  readmeByNetwork += generateContractTable(
    { title: 'Contracts', contracts: poolPermitsByContract.contracts },
    tableCtx
  );
  readmeByNetwork += generateContractTable(
    { title: 'Governance V3 Contracts', contracts: poolPermitsByContract.govV3?.contracts },
    tableCtx
  );
  readmeByNetwork += generateContractTable(
    { title: 'Umbrella Contracts', contracts: poolPermitsByContract.umbrella?.contracts },
    tableCtx
  );
  readmeByNetwork += generateContractTable(
    { title: 'Risk Agent Contracts', contracts: poolPermitsByContract.agentHub?.contracts },
    tableCtx
  );
  readmeByNetwork += generateContractTable(
    { title: 'Permissioned Payloads Controller Contracts', contracts: poolPermitsByContract.ppc?.contracts },
    tableCtx
  );

  // Role tables - each was ~30 lines, now 4 lines each
  readmeByNetwork += generateRoleTable(
    { title: 'Admins', roles: poolPermitsByContract.roles?.role },
    tableCtx
  );
  readmeByNetwork += generateRoleTable(
    { title: 'Granular Guardian Admins', roles: poolPermitsByContract.govV3?.ggRoles?.role },
    tableCtx
  );
  // ... etc
};
```

### 11.3 Additional Issue: generateTableAddress Nesting

The `generateTableAddress` function (lines 28-84) has deeply nested ternary operators:

```typescript
// Current: 6 levels of nested ternaries - very hard to read
return address && checkSummedAddress
  ? '[' +
  (
    addressesNames[address]
      ? addressesNames[address]
      : addressesNames[checkSummedAddress]
        ? addressesNames[checkSummedAddress]
        : contractsByAddress[address]
          ? contractsByAddress[address]
          : contractsByAddress[checkSummedAddress]
            ? contractsByAddress[checkSummedAddress]
            : poolGuardians[checkSummedAddress] &&
              poolGuardians[checkSummedAddress].owners.length > 0
              ? addressesNames[checkSummedAddress]
                ? addressesNames[checkSummedAddress]
                : `${checkSummedAddress} (Safe)`
              : checkSummedAddress) + ...
```

**Solution: Extract to helper with early returns**

```typescript
const resolveAddressName = (
  address: string,
  checkSummed: string,
  addressesNames: Record<string, string>,
  contractsByAddress: ContractsByAddress,
  poolGuardians: PoolGuardians
): string => {
  // Check addressesNames first (both formats)
  if (addressesNames[address]) return addressesNames[address];
  if (addressesNames[checkSummed]) return addressesNames[checkSummed];

  // Check contractsByAddress (both formats)
  if (contractsByAddress[address]) return contractsByAddress[address];
  if (contractsByAddress[checkSummed]) return contractsByAddress[checkSummed];

  // Check if it's a known Safe
  if (poolGuardians[checkSummed]?.owners.length > 0) {
    return addressesNames[checkSummed] || `${checkSummed} (Safe)`;
  }

  // Fallback to checksummed address
  return checkSummed;
};

export const generateTableAddress = (
  address: string | undefined,
  addressesNames: Record<string, string>,
  contractsByAddress: ContractsByAddress,
  poolGuardians: PoolGuardians,
  network: string,
  chainId?: string,
): string => {
  if (!address) return '-';

  const checkSummed = getAddress(address);

  // Handle cross-chain lookups
  if (chainId) {
    contractsByAddress = enrichWithCrossChainContracts(chainId, contractsByAddress);
  }

  const name = resolveAddressName(address, checkSummed, addressesNames, contractsByAddress, poolGuardians);
  const url = getExplorerUrl(checkSummed, contractsByAddress, network);

  return `[${name}](${url})`;
};
```

### 11.4 Contract Aggregation Duplication

The `v3Contracts` aggregation (lines 140-231) has a massive if/else chain with similar spreads:

```typescript
// Current: ~90 lines of similar spreads
if (pool === Pools.LIDO || pool === Pools.ETHERFI) {
  v3Contracts = generateContractsByAddress({
    ...(poolPermitsByContract?.contracts || {}),
    ...getPermissionsByNetwork(network)['V3'].govV3?.contracts,
    ...getPermissionsByNetwork(network)['V3'].collector?.contracts,
    ...getPermissionsByNetwork(network)['V3'].clinicSteward?.contracts,
    ...getPermissionsByNetwork(network)['V3'].umbrella?.contracts,
    ...getPermissionsByNetwork(network)['V3'].ppc?.contracts,
  });
} else if (pool === Pools.TENDERLY) {
  // Same pattern repeated...
} else if (pool === Pools.LIDO_TENDERLY) {
  // Same pattern repeated...
} // ... etc
```

**Solution: Configuration-driven aggregation**

```typescript
const getContractSources = (network: string, pool: string): string[] => {
  const sources: string[] = ['contracts'];

  // All pools include these from V3 (or V3_WHITE_LABEL)
  const basePool = pool === Pools.V3_WHITE_LABEL ? 'V3_WHITE_LABEL' : 'V3';
  const commonSources = ['govV3', 'collector', 'clinicSteward', 'umbrella', 'ppc'];

  // Some pools also include agentHub
  const withAgentHub = [Pools.TENDERLY, Pools.LIDO_TENDERLY, Pools.ETHERFI_TENDERLY];
  if (withAgentHub.includes(pool as Pools)) {
    commonSources.push('agentHub');
  }

  return sources.concat(commonSources);
};

// Usage
const sources = getContractSources(network, pool);
const contractsToMerge = sources.map(src =>
  getPermissionsByNetwork(network)[basePool]?.[src]?.contracts || {}
);
v3Contracts = generateContractsByAddress(Object.assign({}, ...contractsToMerge));
```

### 11.5 Implementation Summary

| Change | Lines Reduced | Files Affected |
|--------|---------------|----------------|
| Generic contract table generator | -350 lines | createTables.ts |
| Generic role table generator | -150 lines | createTables.ts |
| Flatten generateTableAddress | Same lines | createTables.ts |
| Configuration-driven contract aggregation | -70 lines | createTables.ts |

**Estimated total reduction**: ~570 lines in createTables.ts (from 1166 to ~600 lines)

---

## 12. modifiersCalculator.ts Patterns (Medium Priority)

> **Note**: These patterns should be extracted **during** the Unified Event Indexing refactor (Section 13), not as a separate phase. The helpers are needed when refactoring modifiersCalculator.

### 12.1 Repeated Tenderly Provider Pattern

This pattern appears **15+ times**:

```typescript
poolKey === Pools.TENDERLY ||
  poolKey === Pools.LIDO_TENDERLY ||
  poolKey === Pools.ETHERFI_TENDERLY
  ? getRpcClientFromUrl(pool.tenderlyRpcUrl!)
  : provider
```

**Solution: Extract helper**

```typescript
const isTenderlyPool = (poolKey: string): boolean => {
  return poolKey === Pools.TENDERLY ||
    poolKey === Pools.LIDO_TENDERLY ||
    poolKey === Pools.ETHERFI_TENDERLY;
};

const getProviderForPool = (
  poolKey: string,
  pool: PoolConfigs,
  defaultProvider: Client
): Client => {
  return isTenderlyPool(poolKey) && pool.tenderlyRpcUrl
    ? getRpcClientFromUrl(pool.tenderlyRpcUrl)
    : defaultProvider;
};

// Usage (once at start of pool processing)
const poolProvider = getProviderForPool(poolKey, pool, provider);
```

### 12.2 Repeated FromBlock Resolution Pattern

This pattern appears **8+ times**:

```typescript
let fromBlock;
if (pool.tenderlyBasePool) {
  fromBlock = pool.tenderlyBlock;
} else {
  fromBlock = fullJson[poolKey]?.XXX?.latestBlockNumber || pool.XXXBlock;
}
```

**Solution: Generic helper**

```typescript
interface BlockResolutionConfig {
  tenderlyBlock?: number;
  configBlock: number;
  savedBlock?: number;
}

const resolveFromBlock = (
  hasTenderlyBase: boolean,
  config: BlockResolutionConfig
): number => {
  if (hasTenderlyBase) {
    return config.tenderlyBlock || config.configBlock;
  }
  return config.savedBlock || config.configBlock;
};

// Usage
const fromBlock = resolveFromBlock(!!pool.tenderlyBasePool, {
  tenderlyBlock: pool.tenderlyBlock,
  configBlock: pool.aclBlock,
  savedBlock: fullJson[poolKey]?.roles?.latestBlockNumber,
});
```

### 12.3 Repeated Logging Pattern

```typescript
console.log(`
  ------------------------------------
    network: ${network}
    pool: ${poolKey}
    fromBlock: ${fromBlock}
    ${tableName} Table
  ------------------------------------
  `);
```

**Solution: Logging helper**

```typescript
const logTableGeneration = (network: string, pool: string, tableName: string, fromBlock?: number) => {
  const blockInfo = fromBlock ? `fromBlock: ${fromBlock}\n` : '';
  console.log(`
------------------------------------
  network: ${network}
  pool: ${pool}
  ${blockInfo}${tableName} Table
------------------------------------`);
};
```

### 12.4 Implementation Summary

| Change | Lines Reduced | Complexity |
|--------|---------------|------------|
| Extract `getProviderForPool()` | -30 lines | 15 checks → 1 call |
| Extract `resolveFromBlock()` | -40 lines | 8 patterns → 1 helper |
| Extract logging helper | -20 lines | Consistent format |

**Estimated reduction**: ~90 lines and much cleaner flow

---

## 13. Unified Event Indexing (High Priority)

### 13.1 The Problem: Redundant Event Indexing

Currently, `modifiersCalculator.ts` makes **8+ separate event indexing calls** per network, each with its own block number:

```typescript
// Current structure - each section indexes independently
{
  "V3": {
    "roles": { "latestBlockNumber": 24373016 },           // ACL_MANAGER events
    "govV3": {
      "latestCCCBlockNumber": 24373017,                   // CCC events
      "ggRoles": { "latestBlockNumber": 24373017 }        // GRANULAR_GUARDIAN events
    },
    "collector": {
      "cRoles": { "latestBlockNumber": 24373017 }         // COLLECTOR events
    },
    "clinicSteward": {
      "clinicStewardRoles": { "latestBlockNumber": 24373017 }
    },
    "umbrella": {
      "umbrellaRoles": { "latestBlockNumber": 24373017 },
      "umbrellaIncentivesRoles": { "latestBlockNumber": 24373017 }
    }
  },
  "GHO": {
    "roles": { "latestBlockNumber": 23040127 },           // GHO_TOKEN events
    "gsmRoles": {
      "GsmUsdc": { "latestBlockNumber": 21000000 },
      "GsmUsdt": { "latestBlockNumber": 21000000 }
    }
  }
}
```

**Problems:**
| Issue | Impact |
|-------|--------|
| 8+ separate `getEvents()` calls per network | Redundant RPC calls for overlapping block ranges |
| 8+ different `latestBlockNumber` values | Many git conflicts from CI updates |
| Same block ranges re-indexed multiple times | Wasted compute and API calls |
| Scattered block tracking logic | Hard to maintain |

### 13.2 The Challenge: Different Deployment Blocks

Different contracts have different deployment blocks in config:

```typescript
// From configs.ts - Ethereum V3 pool
{
  aclBlock: 16291117,              // ACL_MANAGER deployed
  crossChainControllerBlock: 18090380,   // CCC deployed later
  granularGuardianBlock: 20324867,       // GG deployed even later
  umbrellaBlock: 22346140,               // Umbrella most recent
  collectorBlock: 21765718,
  clinicStewardBlock: 21967120,
}
```

**The challenge**: When adding a new event type (e.g., a new contract), we need to index from its deployment block, which might be older than the current `latestBlockNumber`.

### 13.3 Solution: Unified Event Indexer with Deployment Tracking

**Key insight**: We can index ALL events in one pass, but need to track which contracts have been indexed from their deployment blocks.

**New metadata structure** (`{chainId}-metadata.json`):

```json
{
  "latestBlockNumber": 24373017,
  "indexedContracts": {
    "ACL_MANAGER": { "deploymentBlock": 16291117, "firstIndexedAt": 16291117 },
    "CROSS_CHAIN_CONTROLLER": { "deploymentBlock": 18090380, "firstIndexedAt": 18090380 },
    "GRANULAR_GUARDIAN": { "deploymentBlock": 20324867, "firstIndexedAt": 20324867 },
    "UMBRELLA": { "deploymentBlock": 22346140, "firstIndexedAt": 22346140 },
    "COLLECTOR": { "deploymentBlock": 21765718, "firstIndexedAt": 21765718 }
  }
}
```

**Indexing logic:**

```typescript
// helpers/eventIndexer.ts

interface ContractEventConfig {
  address: string;
  deploymentBlock: number;
  eventTypes: string[];
  roleNames?: string[];  // For role-based contracts
}

interface IndexedContractInfo {
  deploymentBlock: number;
  firstIndexedAt: number;
}

interface NetworkMetadata {
  latestBlockNumber: number;
  indexedContracts: Record<string, IndexedContractInfo>;
}

/**
 * Unified event indexer that fetches all events in a single pass.
 *
 * Algorithm:
 * 1. For each contract, determine the "effective from block":
 *    - If contract is new (not in indexedContracts): use deploymentBlock
 *    - If contract exists: use latestBlockNumber (already have historical data)
 * 2. Group contracts by effective fromBlock for efficient batching
 * 3. Fetch events for each group
 * 4. Distribute events to appropriate processors
 * 5. Update metadata with new latestBlockNumber
 */
export class UnifiedEventIndexer {
  constructor(
    private client: Client,
    private chainId: string,
    private metadata: NetworkMetadata
  ) {}

  async indexAllEvents(contracts: ContractEventConfig[]): Promise<{
    eventsByContract: Map<string, Log[]>;
    newLatestBlock: number;
    updatedMetadata: NetworkMetadata;
  }> {
    const currentBlock = await getBlockNumber(this.client);
    const savedLatestBlock = this.metadata.latestBlockNumber || 0;

    // Determine effective fromBlock for each contract
    const contractsWithFromBlock = contracts.map(contract => {
      const indexed = this.metadata.indexedContracts[contract.address];

      // If not indexed before, start from deployment block
      // If indexed before, start from where we left off
      const effectiveFromBlock = indexed
        ? savedLatestBlock
        : contract.deploymentBlock;

      return { ...contract, effectiveFromBlock };
    });

    // Group contracts by their effective fromBlock for efficient batching
    const byFromBlock = this.groupByFromBlock(contractsWithFromBlock);

    // Fetch events for each group
    const eventsByContract = new Map<string, Log[]>();

    for (const [fromBlock, contractGroup] of byFromBlock) {
      const addresses = contractGroup.map(c => c.address);
      const eventTypes = [...new Set(contractGroup.flatMap(c => c.eventTypes))];

      const { logs } = await getEvents({
        client: this.client,
        fromBlock,
        toBlock: currentBlock,
        contracts: addresses,  // Could batch multiple contracts
        eventTypes,
        limit: getLimit(this.chainId),
      });

      // Distribute logs to their respective contracts
      for (const log of logs) {
        const contractAddr = log.address.toLowerCase();
        if (!eventsByContract.has(contractAddr)) {
          eventsByContract.set(contractAddr, []);
        }
        eventsByContract.get(contractAddr)!.push(log);
      }
    }

    // Update metadata
    const updatedMetadata: NetworkMetadata = {
      latestBlockNumber: Number(currentBlock),
      indexedContracts: { ...this.metadata.indexedContracts },
    };

    // Mark newly indexed contracts
    for (const contract of contracts) {
      if (!updatedMetadata.indexedContracts[contract.address]) {
        updatedMetadata.indexedContracts[contract.address] = {
          deploymentBlock: contract.deploymentBlock,
          firstIndexedAt: contract.deploymentBlock,
        };
      }
    }

    return {
      eventsByContract,
      newLatestBlock: Number(currentBlock),
      updatedMetadata,
    };
  }

  private groupByFromBlock(contracts: Array<ContractEventConfig & { effectiveFromBlock: number }>) {
    const groups = new Map<number, typeof contracts>();
    for (const contract of contracts) {
      const key = contract.effectiveFromBlock;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(contract);
    }
    return groups;
  }
}
```

### 13.4 Handling New Event Types

When adding a new contract/event type:

```typescript
// Scenario: Adding UMBRELLA contract to an existing network
// - latestBlockNumber is at 24000000
// - UMBRELLA was deployed at block 22346140

// The indexer sees:
// - UMBRELLA not in indexedContracts
// - Effective fromBlock = 22346140 (deploymentBlock)

// It will:
// 1. Fetch UMBRELLA events from 22346140 to currentBlock (catch up)
// 2. Fetch other contracts' events from 24000000 to currentBlock
// 3. Update metadata to include UMBRELLA
```

**Config structure change:**

```typescript
// Before: scattered block numbers
{
  aclBlock: 16291117,
  crossChainControllerBlock: 18090380,
  granularGuardianBlock: 20324867,
}

// After: unified contract configs
{
  eventContracts: {
    ACL_MANAGER: {
      addressKey: 'ACL_MANAGER',  // Key in addressBook
      deploymentBlock: 16291117,
      eventTypes: ['RoleGranted', 'RoleRevoked'],
      roleNames: protocolRoleNames,
    },
    CROSS_CHAIN_CONTROLLER: {
      addressKey: 'CROSS_CHAIN_CONTROLLER',
      deploymentBlock: 18090380,
      eventTypes: ['SenderUpdated'],
    },
    GRANULAR_GUARDIAN: {
      addressKey: 'GRANULAR_GUARDIAN',
      deploymentBlock: 20324867,
      eventTypes: ['RoleGranted', 'RoleRevoked'],
      roleNames: granularGuardianRoleNames,
    },
    // etc.
  }
}
```

### 13.5 Refactored modifiersCalculator Flow

```typescript
// Before: 8+ separate indexing calls per pool
admins = await getCurrentRoleAdmins(provider, ..., fromBlock1, ...);
cAdmins = await getCurrentRoleAdmins(provider, ..., fromBlock2, ...);
ggRoles = await getCurrentRoleAdmins(provider, ..., fromBlock3, ...);
umbrellaRoles = await getCurrentRoleAdmins(provider, ..., fromBlock4, ...);
// ... etc, each with its own block number tracking

// After: Single unified indexing call per pool
const indexer = new UnifiedEventIndexer(provider, network, metadata);

const contractConfigs = buildContractConfigs(pool, addressBook);
const { eventsByContract, updatedMetadata } = await indexer.indexAllEvents(contractConfigs);

// Process events by contract type (pure functions, no RPC calls)
const aclEvents = eventsByContract.get(addressBook.ACL_MANAGER.toLowerCase()) || [];
const cccEvents = eventsByContract.get(addressBook.CROSS_CHAIN_CONTROLLER?.toLowerCase()) || [];
// etc.

// Convert events to roles
const admins = getRoleAdmins({ oldRoles, roleNames: protocolRoleNames, eventLogs: aclEvents });
const ggRoles = getRoleAdmins({ oldRoles, roleNames: granularGuardianRoleNames, eventLogs: ggEvents });
// etc.

// Save single metadata file per network
saveMetadata(network, updatedMetadata);
```

### 13.6 Benefits

| Benefit | Impact |
|---------|--------|
| **Single block number per network** | Dramatically fewer git conflicts |
| **Reduced RPC calls** | ~8x fewer indexing operations per network |
| **Unified indexing logic** | ~200 lines of duplicated code removed from adminRoles.ts, crossChainControllerLogs.ts |
| **Easier to add new event types** | Just add to config, indexer handles catchup automatically |
| **Cleaner modifiersCalculator** | Main function becomes orchestration only |
| **Consistent event handling** | All events processed the same way |

### 13.7 Migration Strategy

**Phase 1: Add unified indexer alongside existing code**
- Create `UnifiedEventIndexer` class
- Add new metadata structure
- Both systems run in parallel (verify output matches)

**Phase 2: Switch to unified indexer**
- Replace individual `getCurrentRoleAdmins` calls
- Update config structure to use `eventContracts`
- Remove old block number tracking

**Phase 3: Clean up**
- Remove old `latestBlockNumber` fields from permissions JSON
- Migrate to single metadata file per network
- Remove redundant helper functions

### 13.8 Edge Cases

**1. Tenderly forks**: Handle as a separate indexing context
```typescript
// For Tenderly pools:
// 1. Index mainnet events up to tenderlyBlock (using mainnet provider)
// 2. Index tenderly fork events from tenderlyBlock (using tenderly provider)
// 3. Merge results
```

**2. Contract redeployment**: If a contract is redeployed at a new address:
- Add new entry to `eventContracts` with the new address and deployment block
- Old events remain in the data, new events add to it

**3. Historical re-index needed**: If deployment block in config is updated to an earlier block:
```typescript
// Compare config.deploymentBlock with metadata.firstIndexedAt
// If config is older, we need to re-index from the new (older) deployment block
const needsReindex = contract.deploymentBlock < indexed.firstIndexedAt;
if (needsReindex) {
  // Index from contract.deploymentBlock to indexed.firstIndexedAt
  // Then continue from latestBlockNumber
}
```

### 13.9 Implementation Summary

| Change | Impact |
|--------|--------|
| Single `latestBlockNumber` per network | ~8 block numbers → 1 |
| Unified indexing class | ~200 lines removed from helpers |
| Simplified modifiersCalculator | ~150 lines cleaner flow |
| New config structure | More declarative, easier to extend |

---

## 14. Permission Scripts Refactoring (Medium Priority)

### 14.1 The Problem: Repetitive Contract Resolution Patterns

The permission scripts (`v3Permissions.ts`, `ghoPermissions.ts`, `govV3Permissions.ts`, `umbrellaPermissions.ts`) total **2,641 lines** with massive repetition:

**File sizes:**
| File | Lines |
|------|-------|
| v3Permissions.ts | 1,184 |
| govV3Permissions.ts | 628 |
| ghoPermissions.ts | 449 |
| umbrellaPermissions.ts | 380 |
| **Total** | **2,641** |

**96 calls to `getSafeOwners`/`getSafeThreshold`** in v3Permissions.ts alone!

### 14.2 Pattern 1: "onlyOwner" Contract Pattern (20+ occurrences)

```typescript
// This exact pattern repeats 20+ times:
if (addressBook.XXX) {
  const xxxContract = getContract({
    address: getAddress(addressBook.XXX),
    abi: onlyOwnerAbi,
    client: provider
  });
  const xxxOwner = await xxxContract.read.owner() as Address;

  obj['XXX'] = {
    address: addressBook.XXX,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [
          {
            address: xxxOwner,
            owners: await getSafeOwners(provider, xxxOwner),
            signersThreshold: await getSafeThreshold(provider, xxxOwner),
          },
        ],
        functions: roles['XXX']['onlyOwner'],
      },
    ],
  };
}
```

**Solution: Generic helper**

```typescript
// helpers/contractResolvers.ts

/**
 * Resolves permissions for a simple Ownable contract.
 * Replaces 20+ near-identical code blocks.
 */
export const resolveOwnableContract = async (
  contractName: string,
  address: string | undefined,
  provider: Client,
  ownerResolver: OwnerResolver,
  roles: MethodsByModifier,
  proxyAdmin?: string
): Promise<ContractInfo | null> => {
  if (!address) return null;

  const contract = getContract({
    address: getAddress(address),
    abi: onlyOwnerAbi,
    client: provider
  });
  const owner = await contract.read.owner() as Address;
  const ownerInfo = await ownerResolver.resolve(owner);

  return {
    address,
    proxyAdmin,
    modifiers: [
      {
        modifier: 'onlyOwner',
        addresses: [{
          address: owner,
          owners: ownerInfo.owners,
          signersThreshold: ownerInfo.threshold,
        }],
        functions: roles[contractName]?.['onlyOwner'] || [],
      },
    ],
  };
};

// Usage in v3Permissions.ts:
if (addressBook.WETH_GATEWAY) {
  obj['WrappedTokenGatewayV3'] = await resolveOwnableContract(
    'WrappedTokenGatewayV3',
    addressBook.WETH_GATEWAY,
    provider,
    ownerResolver,
    roles
  );
}
```

### 14.3 Pattern 2: Admin Role Mapping (10+ occurrences)

```typescript
// This pattern repeats 10+ times with different role names:
...adminRoles['POOL_ADMIN'].map((roleAddress) => {
  return {
    address: roleAddress,
    owners: owners['POOL_ADMIN'][roleAddress].owners || [],
    signersThreshold: owners['POOL_ADMIN'][roleAddress].threshold || 0,
  };
}),
```

**Solution: Reusable mapper**

```typescript
// helpers/contractResolvers.ts

/**
 * Maps admin role addresses to AddressInfo objects.
 * Replaces 10+ identical mapping patterns.
 */
export const mapRoleAddresses = (
  roleName: string,
  adminRoles: Record<string, string[]>,
  owners: Record<string, Record<string, Guardian>>
): AddressInfo[] => {
  if (!adminRoles[roleName]) return [];

  return adminRoles[roleName].map((roleAddress) => ({
    address: roleAddress,
    owners: owners[roleName]?.[roleAddress]?.owners || [],
    signersThreshold: owners[roleName]?.[roleAddress]?.threshold || 0,
  }));
};

// Usage:
addresses: uniqueAddresses([
  ...mapRoleAddresses('POOL_ADMIN', adminRoles, owners),
  ...mapRoleAddresses('RISK_ADMIN', adminRoles, owners),
]),
```

### 14.4 Pattern 3: Edge Risk Steward Pattern (4+ identical blocks)

```typescript
// Nearly identical for CAPS, DISCOUNT_RATE, RATES, PENDLE_EMODE:
if (addressBook.EDGE_RISK_STEWARD_XXX) {
  const contract = getContract({ ... });
  const owner = await contract.read.owner() as Address;
  const council = await contract.read.RISK_COUNCIL() as Address;
  obj['EdgeRiskStewardXXX'] = {
    // identical structure with onlyOwner + onlyRiskCouncil
  };
}
```

**Solution: Generic Edge Steward resolver**

```typescript
const EDGE_STEWARD_CONFIGS = [
  { key: 'EDGE_RISK_STEWARD_CAPS', name: 'EdgeRiskStewardCaps' },
  { key: 'EDGE_RISK_STEWARD_DISCOUNT_RATE', name: 'EdgeRiskStewardDiscountRate' },
  { key: 'EDGE_RISK_STEWARD_RATES', name: 'EdgeRiskStewardRates' },
  { key: 'EDGE_RISK_STEWARD_PENDLE_EMODE', name: 'EdgeRiskStewardEMode' },
];

for (const config of EDGE_STEWARD_CONFIGS) {
  if (addressBook[config.key]) {
    obj[config.name] = await resolveRiskCouncilContract(
      config.name,
      addressBook[config.key],
      provider,
      ownerResolver,
      roles
    );
  }
}
```

### 14.5 Pattern 4: limits.ts Simplification

Current code has a useless if/else chain:

```typescript
// Current - all branches return the same value!
if (Number(chainId) === Number(ChainId.sonic)) {
  limit = 9999;
} else if (Number(chainId) === Number(ChainId.celo)) {
  limit = 9999;
} else if (Number(chainId) === Number(ChainId.linea)) {
  limit = 9999;
// ... 6 more identical branches
} else {
  limit = 9999;
}
```

**Solution:**

```typescript
// Just return the default, with option for future customization
const CHAIN_LIMITS: Partial<Record<number, number>> = {
  // Add chain-specific limits here when needed
  // [ChainId.avalanche]: 3000,
};

export const getLimit = (chainId: string): number => {
  return CHAIN_LIMITS[Number(chainId)] ?? 9999;
};
```

### 14.6 Implementation Summary

| Change | Lines Reduced | Impact |
|--------|---------------|--------|
| `resolveOwnableContract()` helper | ~400 lines | 20 blocks → 20 one-liners |
| `mapRoleAddresses()` helper | ~100 lines | Cleaner role mapping |
| Edge Steward loop | ~120 lines | 4 blocks → 1 loop |
| limits.ts cleanup | ~20 lines | Simpler code |

**Estimated total reduction**: ~640 lines from permission scripts

---

## 15. Minor Improvements (Low Priority)

### 15.1 tables.ts: Cleaner String Building

```typescript
// Current - forEach with index checks
export const getTableHeader = (headers: string[]): string => {
  let headerNames = '| ';
  let separator = '|';
  headers.forEach((header: string, index: number) => {
    headerNames += `${header} |`;
    separator += '----------|';
    if (index === headers.length - 1) {
      headerNames += '\n';
      separator += '\n';
    }
  });
  headerNames += separator;
  return headerNames;
};

// Better - use join
export const getTableHeader = (headers: string[]): string => {
  const headerRow = `| ${headers.join(' | ')} |\n`;
  const separator = `|${headers.map(() => '----------').join('|')}|\n`;
  return headerRow + separator;
};
```

### 15.2 explorer.ts: Null Handling

```typescript
// Current - returns null for invalid addresses
export const explorerAddressUrlComposer = (
  address: string,
  chainId: typeof ChainId,
): string | null => {
  if (isAddress(address)) {
    return `${networkConfigs[Number(chainId)].explorer}/address/${address}`;
  }
  return null;
};

// Better - handle edge cases explicitly, return empty string for consistency
export const explorerAddressUrlComposer = (
  address: string | undefined,
  chainId: string | number,
): string => {
  if (!address || !isAddress(address)) return '';
  const explorer = networkConfigs[Number(chainId)]?.explorer;
  if (!explorer) return '';
  return `${explorer}/address/${address}`;
};
```

### 15.3 @ts-ignore Cleanup

Multiple `@ts-ignore` comments that should be fixed with proper types:

```typescript
// fileSystem.ts:12
// @ts-ignore
return JSON.parse(file);

// Fix: Use proper typing
return JSON.parse(file.toString()) as FullPermissions;
```

---

## Summary

| Category | Priority | Estimated Impact | Phase |
|----------|----------|------------------|-------|
| Code Duplication (addressUtils, OwnerResolver) | High | ~500 lines reduced + RPC caching | 1 |
| Permission Scripts Cleanup (contractResolvers) | High | ~640 lines reduced | 2 |
| Decentralization Logic Refactoring | High | ~120 lines reduced, 6-7 nesting → 2 | 3 |
| **Unified Event Indexing** | **High** | **~8x fewer RPC calls, 8→1 block numbers** | **4** |
| Table Generation Refactoring | High | ~570 lines reduced in createTables.ts | 5 |
| Configuration Organization | Medium | Improves maintainability significantly | 6 |
| Architecture Improvements | Medium | Enables easier addition of new pools | 7 |
| Type Safety | Medium | Prevents runtime errors, improves DX | 8 |
| Error Handling & Logging | Medium | Better debugging and monitoring | 1 |
| Code Quality & Testing | Low | Cleaner codebase, regression prevention | 9 |

**Total estimated reduction**: ~1,800+ lines while significantly improving readability, maintainability, and reducing RPC calls.

### Key Benefits
- **~8x fewer RPC calls** per network (unified event indexing)
- **Single block number per network** instead of 8+ (dramatically fewer git conflicts)
- **~1,800 lines removed** through deduplication and abstraction
- **Better maintainability** through configuration-driven patterns

The improvements focus on making the codebase more maintainable while preserving **100% output compatibility** - the generated `out/*.md` tables must remain identical.
