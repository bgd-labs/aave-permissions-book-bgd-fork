# Aave Permissions Book - Improvement Plan

## Priority Overview

| Priority | Feature | Impact | Effort | Status |
|----------|---------|--------|--------|--------|
| **1** | CLI Selection (Network/Pool/Tenderly) | High - Developer productivity | Low | Not started |
| **2** | configs.ts Refactoring | Medium - Maintainability | High | Not started |

---

# Priority 1: CLI Selection Feature

## Goal

Add the ability to run permission generation and table creation for:
- A specific network or multiple networks (instead of all networks)
- A specific pool or multiple pools within a network
- Tenderly pools only (exclusive mode - replaces env variable)
- All networks/pools (current behavior, default)

## Current vs Proposed

| Current | Proposed |
|---------|----------|
| `npm run modifiers:generate` (all networks) | Same (default) |
| `TENDERLY=true npm run modifiers:generate` | `npm run modifiers:generate -- --tenderly` |
| No way to run single network | `npm run modifiers:generate -- -n 1` |
| No way to run single pool | `npm run modifiers:generate -- -n 1 -p V3` |

## CLI Flags

```bash
--network <chainId>  or  -n <chainId>   # Repeatable
--pool <poolKey>     or  -p <poolKey>   # Repeatable, requires --network
--tenderly           or  -t             # Exclusive: only tenderly pools
```

**Note**: Network must be ChainId numbers (e.g., `1` for mainnet, `137` for polygon).

### Mode Behavior

| Flag | Behavior |
|------|----------|
| (none) | Process regular pools only, skip tenderly pools |
| `--tenderly` | Process tenderly pools only, skip regular pools |

**Important**: No combined mode. Regular OR tenderly, never both.

---

## Implementation

### Step 1.1: Create CLI Parser (`helpers/cli.ts`)

```typescript
import { networkConfigs } from './configs.js';
import { isTenderlyPool } from './poolHelpers.js';

export interface CliArgs {
  networks: number[];
  pools: string[];
  tenderly: boolean;
}

export const parseCliArgs = (): CliArgs => {
  const args = process.argv.slice(2);
  const result: CliArgs = { networks: [], pools: [], tenderly: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if ((arg === '--network' || arg === '-n') && nextArg && !nextArg.startsWith('-')) {
      result.networks.push(Number(nextArg));
      i++;
    } else if ((arg === '--pool' || arg === '-p') && nextArg && !nextArg.startsWith('-')) {
      result.pools.push(nextArg.toUpperCase());
      i++;
    } else if (arg === '--tenderly' || arg === '-t') {
      result.tenderly = true;
    }
  }

  // Validation
  for (const network of result.networks) {
    if (!networkConfigs[network]) {
      console.error(`Unknown network: ${network}`);
      console.error(`Available: ${Object.keys(networkConfigs).join(', ')}`);
      process.exit(1);
    }
  }

  if (result.pools.length > 0 && result.networks.length === 0) {
    console.error('--pool requires --network');
    process.exit(1);
  }

  if (result.pools.length > 0) {
    for (const network of result.networks) {
      for (const pool of result.pools) {
        if (!networkConfigs[network].pools[pool]) {
          console.error(`Unknown pool: ${pool} for network ${network}`);
          process.exit(1);
        }
      }
    }
  }

  return result;
};

export const getNetworksToProcess = (args: CliArgs): number[] => {
  return args.networks.length > 0
    ? args.networks
    : Object.keys(networkConfigs).map(Number);
};

export const getPoolsToProcess = (network: number, args: CliArgs): string[] => {
  const allPools = Object.keys(networkConfigs[network].pools);

  let pools = args.pools.length > 0
    ? allPools.filter(p => args.pools.includes(p))
    : allPools;

  // Exclusive mode filtering
  pools = args.tenderly
    ? pools.filter(p => isTenderlyPool(p))
    : pools.filter(p => !isTenderlyPool(p));

  return pools;
};

export const logExecutionConfig = (args: CliArgs): void => {
  console.log(`
========================================
  Mode: ${args.tenderly ? 'TENDERLY' : 'REGULAR'}
  Networks: ${args.networks.length > 0 ? args.networks.join(', ') : 'ALL'}
  Pools: ${args.pools.length > 0 ? args.pools.join(', ') : 'ALL'}
========================================
`);
};
```

### Step 1.2: Update `modifiersCalculator.ts`

```typescript
import { parseCliArgs, getNetworksToProcess, getPoolsToProcess, logExecutionConfig } from '../helpers/cli.js';

const generateNetworkPermissions = async (network: number, poolsToProcess: string[]) => {
  // Use poolsToProcess instead of Object.keys(pools)
  for (const poolKey of poolsToProcess) {
    // ... existing logic
  }
};

async function main() {
  const args = parseCliArgs();
  logExecutionConfig(args);

  const networks = getNetworksToProcess(args);
  const permissions = networks.map((network) => {
    const pools = getPoolsToProcess(network, args);
    if (pools.length === 0) {
      console.log(`Skipping network ${network}: no matching pools`);
      return Promise.resolve();
    }
    return generateNetworkPermissions(network, pools);
  });

  await Promise.allSettled(permissions);
}
```

### Step 1.3: Update `createTables.ts`

```typescript
import { parseCliArgs, getNetworksToProcess, getPoolsToProcess, logExecutionConfig } from '../helpers/cli.js';

export const generateAllTables = (args: CliArgs) => {
  const networks = getNetworksToProcess(args);

  for (const network of networks) {
    const pools = getPoolsToProcess(network, args);
    for (const pool of pools) {
      generateTable(network, pool);
    }
  }

  // Only update README when running all networks in regular mode
  if (args.networks.length === 0 && !args.tenderly) {
    saveJson('./README.md', getPrincipalReadme(readmeDirectoryTable));
  }
};

const args = parseCliArgs();
logExecutionConfig(args);
generateAllTables(args);
```

### Step 1.4: Remove `TENDERLY` env variable checks

Replace `process.env.TENDERLY` checks with CLI-based filtering (already handled by `getPoolsToProcess`).

### Step 1.5: (Optional) Add convenience scripts to `package.json`

```json
{
  "scripts": {
    "modifiers:generate": "tsx scripts/modifiersCalculator.ts",
    "modifiers:tenderly": "tsx scripts/modifiersCalculator.ts --tenderly",
    "tables:create": "tsx scripts/createTables.ts",
    "tables:tenderly": "tsx scripts/createTables.ts --tenderly"
  }
}
```

---

## Files to Modify

| File | Action |
|------|--------|
| `helpers/cli.ts` | **NEW** |
| `scripts/modifiersCalculator.ts` | Update main() |
| `scripts/createTables.ts` | Update generateAllTables() |
| `package.json` | Optional scripts |

---

## Testing Checklist

- [ ] `npm run modifiers:generate` - all networks, regular pools
- [ ] `npm run modifiers:generate -- -n 1` - mainnet only
- [ ] `npm run modifiers:generate -- -n 1 -n 137` - mainnet + polygon
- [ ] `npm run modifiers:generate -- -n 1 -p V3` - mainnet V3 only
- [ ] `npm run modifiers:generate -- --tenderly` - tenderly pools only
- [ ] `npm run modifiers:generate -- -t -n 1` - mainnet tenderly only
- [ ] Invalid network shows error
- [ ] Invalid pool shows error
- [ ] `--pool` without `--network` shows error

---

# Priority 2: configs.ts Refactoring

## Current Problems

1. **Monolithic file** (~1300 lines) - Hard to navigate, causes git conflicts
2. **Duplicated Tenderly configs** - Each copies all 15+ properties from base pool
3. **Scattered address names** - Same addresses duplicated across networks
4. **~200 lines of commented code** - Old tenderly configs
5. **Inconsistent structure** - No clear schema for pool configs

---

## Proposed Structure

```
helpers/
├── configs/
│   ├── index.ts              # Re-exports networkConfigs
│   ├── types.ts              # Pool and network types
│   ├── constants.ts          # Pools enum, role names
│   ├── poolBuilder.ts        # Factory functions
│   ├── addresses/
│   │   └── shared.ts         # Common addresses
│   └── networks/
│       ├── mainnet.ts
│       ├── polygon.ts
│       ├── arbitrum.ts
│       └── index.ts          # Combines all
```

---

## Implementation

### Step 2.1: Create Shared Address Registry

```typescript
// helpers/configs/addresses/shared.ts
export const SHARED_ADDRESSES: Record<string, string> = {
  '0xEAF6183bAb3eFD3bF856Ac5C058431C8592394d6': 'Deployer',
  '0xdeadD8aB03075b7FBA81864202a2f59EE25B312b': 'CleanUp Admin',
  '0x3Cbded22F878aFC8d39dCD744d3Fe62086B76193': 'ACI Automation',
  '0x22740deBa78d5a0c24C58C740e3715ec29de1bFa': 'Finance Risk Council',
};

export const mergeAddressNames = (
  networkSpecific: Record<string, string>,
): Record<string, string> => ({
  ...SHARED_ADDRESSES,
  ...networkSpecific,
});
```

### Step 2.2: Create Pool Builders

```typescript
// helpers/configs/poolBuilder.ts

export const createV3Pool = (config: V3PoolConfig): PoolConfig => ({
  permissionsJson: './statics/functionsPermissionsV3.json',
  crossChainPermissionsJson: './statics/functionsPermissionsGovV3.json',
  functionsPermissionsAgentHubJson: './statics/functionsPermissionsAgentHub.json',
  ...config,
});

export const createTenderlyPool = (
  basePool: PoolConfig,
  basePoolKey: Pools,
  overrides: TenderlyOverrides,
): PoolConfig => ({
  ...basePool,
  tenderlyBasePool: basePoolKey,
  ...overrides,
});

export const createV2Pool = (config: V2PoolConfig): PoolConfig => ({
  permissionsJson: './statics/functionsPermissionsV2.json',
  ...config,
});
```

### Step 2.3: Split into Network Files

Example: `helpers/configs/networks/mainnet.ts`

```typescript
import { ChainId } from '@bgd-labs/toolbox';
import { AaveV3Ethereum, GovernanceV3Ethereum, MiscEthereum } from '@bgd-labs/aave-address-book';
import { Pools } from '../constants.js';
import { createV3Pool, createTenderlyPool } from '../poolBuilder.js';
import { mergeAddressNames } from '../addresses/shared.js';

const v3Pool = createV3Pool({
  aclBlock: 16291117,
  collectorBlock: 21765718,
  addressBook: { ...AaveV3Ethereum, ...MiscEthereum },
  governanceAddressBook: GovernanceV3Ethereum,
});

export const mainnetConfig = {
  name: 'Ethereum',
  rpcUrl: process.env.RPC_MAINNET,
  explorer: 'https://etherscan.io',
  addressesNames: mergeAddressNames({
    '0xb812d0944f8F581DfAA3a93Dda0d22EcEf51A9CF': 'BGD',
    // ... network-specific only
  }),
  pools: {
    [Pools.V3]: v3Pool,
    [Pools.TENDERLY]: createTenderlyPool(v3Pool, Pools.V3, {
      tenderlyBlock: 24167154,
      tenderlyRpcUrl: 'https://virtual.mainnet.eu.rpc.tenderly.co/...',
    }),
  },
};
```

### Step 2.4: Update Main configs.ts

```typescript
// helpers/configs.ts (or helpers/configs/index.ts)
export { networkConfigs } from './configs/networks/index.js';
export { Pools, protocolRoleNames, /* ... */ } from './configs/constants.js';
```

### Step 2.5: Remove Commented Code

Delete all commented-out Tenderly configurations.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `helpers/configs/index.ts` | **NEW** |
| `helpers/configs/types.ts` | **NEW** |
| `helpers/configs/constants.ts` | **NEW** (move Pools enum, role names) |
| `helpers/configs/poolBuilder.ts` | **NEW** |
| `helpers/configs/addresses/shared.ts` | **NEW** |
| `helpers/configs/networks/*.ts` | **NEW** (one per network) |
| `helpers/configs.ts` | **MODIFY** (re-export from new structure) |

---

## Benefits

| Before | After |
|--------|-------|
| 1300 line monolith | ~80 lines per network |
| Tenderly duplicates all base config | Tenderly inherits, adds 3 fields |
| Same addresses repeated 15+ times | Shared address registry |
| 200 lines of commented code | Clean, no dead code |
| Git conflicts on every PR | Changes isolated per network |
