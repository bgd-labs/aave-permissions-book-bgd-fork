import { Client } from 'viem';
import { getRpcClientFromUrl } from './rpc.js';

// ============================================================================
// Provider Resolution
// ============================================================================

/**
 * Gets the appropriate RPC provider for a pool.
 * If a forkRpcUrl is provided, returns a client connected to the fork.
 * Otherwise returns the default provider.
 */
export const getProviderForPool = (
  defaultProvider: Client,
  forkRpcUrl?: string,
): Client => {
  if (forkRpcUrl) {
    return getRpcClientFromUrl(forkRpcUrl);
  }
  return defaultProvider;
};

/**
 * Gets the appropriate RPC provider for V3-specific operations.
 * Same as getProviderForPool — the fork RPC is used for all state queries.
 */
export const getV3ProviderForPool = (
  defaultProvider: Client,
  forkRpcUrl?: string,
): Client => {
  if (forkRpcUrl) {
    return getRpcClientFromUrl(forkRpcUrl);
  }
  return defaultProvider;
};

// ============================================================================
// Logging
// ============================================================================

/**
 * Logs table generation progress with consistent formatting.
 */
export const logTableGeneration = (
  network: string | number,
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
