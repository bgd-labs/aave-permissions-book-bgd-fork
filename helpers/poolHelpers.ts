import { Client } from 'viem';
import { Pools, networkConfigs } from './configs.js';
import { getRpcClientFromUrl } from './rpc.js';

// ============================================================================
// Tenderly Pool Detection
// ============================================================================

/**
 * Set of pool keys that are Tenderly forks.
 * These pools require special handling for RPC provider and event indexing.
 */
const TENDERLY_POOLS = new Set<string>([
  Pools.TENDERLY,
  Pools.LIDO_TENDERLY,
  Pools.ETHERFI_TENDERLY,
  Pools.GHO_TENDERLY,
  Pools.V2_TENDERLY,
  Pools.V2_AMM_TENDERLY,
  Pools.V2_ARC_TENDERLY,
  Pools.GOV_V2_TENDERLY,
  Pools.SAFETY_MODULE_TENDERLY,
  Pools.V2_MISC_TENDERLY,
]);

/**
 * Checks if a pool is a Tenderly fork.
 *
 * @param poolKey - The pool key to check
 * @returns true if the pool is a Tenderly fork
 */
export const isTenderlyPool = (poolKey: string): boolean => {
  return TENDERLY_POOLS.has(poolKey);
};

/**
 * Checks if a pool is a V3 Tenderly fork (TENDERLY, LIDO_TENDERLY, ETHERFI_TENDERLY).
 * These specific pools are used for V3 permission resolution.
 *
 * @param poolKey - The pool key to check
 * @returns true if the pool is a V3 Tenderly fork
 */
export const isV3TenderlyPool = (poolKey: string): boolean => {
  return (
    poolKey === Pools.TENDERLY ||
    poolKey === Pools.LIDO_TENDERLY ||
    poolKey === Pools.ETHERFI_TENDERLY
  );
};

// ============================================================================
// Provider Resolution
// ============================================================================

interface PoolConfig {
  tenderlyRpcUrl?: string;
}

/**
 * Gets the appropriate RPC provider for a pool.
 * For Tenderly pools, returns a provider connected to the Tenderly RPC URL.
 * For regular pools, returns the default provider.
 *
 * @param poolKey - The pool key
 * @param pool - The pool configuration containing tenderlyRpcUrl
 * @param defaultProvider - The default provider for the network
 * @returns The appropriate RPC client for the pool
 */
export const getProviderForPool = (
  poolKey: string,
  pool: PoolConfig,
  defaultProvider: Client,
): Client => {
  if (isTenderlyPool(poolKey) && pool.tenderlyRpcUrl) {
    return getRpcClientFromUrl(pool.tenderlyRpcUrl);
  }
  return defaultProvider;
};

/**
 * Gets the appropriate RPC provider for V3-specific operations.
 * Uses the stricter V3 Tenderly pool check.
 *
 * @param poolKey - The pool key
 * @param pool - The pool configuration containing tenderlyRpcUrl
 * @param defaultProvider - The default provider for the network
 * @returns The appropriate RPC client for the pool
 */
export const getV3ProviderForPool = (
  poolKey: string,
  pool: PoolConfig,
  defaultProvider: Client,
): Client => {
  if (isV3TenderlyPool(poolKey) && pool.tenderlyRpcUrl) {
    return getRpcClientFromUrl(pool.tenderlyRpcUrl);
  }
  return defaultProvider;
};

// ============================================================================
// Block Resolution
// ============================================================================

interface BlockResolutionOptions {
  /** Whether this is a Tenderly pool with a base pool */
  hasTenderlyBase: boolean;
  /** The Tenderly fork block number */
  tenderlyBlock?: number;
  /** The deployment/config block number */
  configBlock: number;
  /** The previously saved block number from JSON */
  savedBlock?: number;
}

/**
 * Resolves the fromBlock for event indexing.
 *
 * For Tenderly pools with a base pool, uses the Tenderly block.
 * For regular pools, uses the saved block if available, otherwise the config block.
 *
 * @param options - Block resolution options
 * @returns The resolved fromBlock number
 */
export const resolveFromBlock = (options: BlockResolutionOptions): number => {
  const { hasTenderlyBase, tenderlyBlock, configBlock, savedBlock } = options;

  if (hasTenderlyBase && tenderlyBlock !== undefined) {
    return tenderlyBlock;
  }
  return savedBlock ?? configBlock;
};

// ============================================================================
// Logging
// ============================================================================

/**
 * Logs table generation progress with consistent formatting.
 *
 * @param network - The network/chain ID
 * @param pool - The pool key
 * @param tableName - Optional table name being generated
 * @param fromBlock - Optional fromBlock number
 */
export const logTableGeneration = (
  network: string,
  pool: string,
  tableName?: string,
  fromBlock?: number,
): void => {
  const blockInfo = fromBlock !== undefined ? `fromBlock: ${fromBlock}\n          ` : '';
  const tableInfo = tableName ? `${tableName} Table` : '';

  console.log(`
        ------------------------------------
          network: ${network}
          pool: ${pool}
          ${blockInfo}${tableInfo}
        ------------------------------------
        `);
};

// ============================================================================
// Tenderly Event Fetching Helpers
// ============================================================================

/**
 * Configuration for fetching events from a Tenderly pool.
 */
export interface TenderlyEventConfig {
  chainId: string;
  poolKey: string;
}

/**
 * Gets the Tenderly block and RPC URL for a pool.
 * Returns undefined if the pool is not a Tenderly fork or doesn't have the required config.
 *
 * @param chainId - The chain ID
 * @param poolKey - The pool key
 * @returns The Tenderly block and RPC URL, or undefined
 */
export const getTenderlyConfig = (
  chainId: string,
  poolKey: string,
): { tenderlyBlock: number; tenderlyRpcUrl: string } | undefined => {
  const poolConfig = networkConfigs[Number(chainId)]?.pools?.[poolKey];

  if (!poolConfig?.tenderlyBlock || !poolConfig?.tenderlyRpcUrl) {
    return undefined;
  }

  return {
    tenderlyBlock: poolConfig.tenderlyBlock,
    tenderlyRpcUrl: poolConfig.tenderlyRpcUrl,
  };
};
