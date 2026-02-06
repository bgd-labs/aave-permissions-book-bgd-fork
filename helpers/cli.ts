import { networkConfigs } from './configs.js';
import { isTenderlyPool } from './poolHelpers.js';

export interface CliArgs {
  networks: number[];
  pools: string[];
  tenderly: boolean;
}

/**
 * Parses CLI arguments for network, pool, and tenderly filtering.
 *
 * Supports:
 *   --network <chainId>  or  -n <chainId>  (repeatable)
 *   --pool <poolKey>     or  -p <poolKey>  (repeatable)
 *   --tenderly           or  -t            (flag)
 */
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

  // Validate networks
  for (const network of result.networks) {
    if (!networkConfigs[network]) {
      console.error(`Unknown network: ${network}`);
      console.error(`Available networks: ${Object.keys(networkConfigs).join(', ')}`);
      process.exit(1);
    }
  }

  // Validate pools require network
  if (result.pools.length > 0 && result.networks.length === 0) {
    console.error('--pool requires --network to be specified');
    process.exit(1);
  }

  // Validate pools exist in specified networks
  if (result.pools.length > 0) {
    for (const network of result.networks) {
      const networkPools = networkConfigs[network].pools;
      for (const pool of result.pools) {
        if (!networkPools[pool]) {
          console.error(`Unknown pool: ${pool} for network ${network}`);
          console.error(`Available pools: ${Object.keys(networkPools).join(', ')}`);
          process.exit(1);
        }
      }
    }
  }

  return result;
};

/**
 * Gets the list of networks to process based on CLI args.
 */
export const getNetworksToProcess = (args: CliArgs): number[] => {
  if (args.networks.length > 0) {
    return args.networks;
  }
  return Object.keys(networkConfigs).map(Number);
};

/**
 * Gets the list of pools to process for a network based on CLI args.
 *
 * Tenderly mode is exclusive: you process EITHER regular pools OR Tenderly
 * pools, never both in the same run. This is because Tenderly pools overwrite
 * their parent pool's output file, so running both would cause conflicts.
 * Default (no --tenderly flag) processes only regular pools.
 */
export const getPoolsToProcess = (network: number, args: CliArgs): string[] => {
  const allPools = Object.keys(networkConfigs[network].pools);

  // Filter by explicit pool selection if provided
  let pools = args.pools.length > 0
    ? allPools.filter(p => args.pools.includes(p))
    : allPools;

  // Filter by tenderly mode (exclusive: regular XOR tenderly)
  if (args.tenderly) {
    pools = pools.filter(p => isTenderlyPool(p));
  } else {
    pools = pools.filter(p => !isTenderlyPool(p));
  }

  return pools;
};

/**
 * Logs the current execution configuration.
 */
export const logExecutionConfig = (args: CliArgs): void => {
  const mode = args.tenderly ? 'TENDERLY' : 'REGULAR';
  const networks = args.networks.length > 0
    ? args.networks.join(', ')
    : 'ALL';
  const pools = args.pools.length > 0
    ? args.pools.join(', ')
    : 'ALL';

  console.log(`
========================================
  Mode: ${mode}
  Networks: ${networks}
  Pools: ${pools}
========================================
`);
};
