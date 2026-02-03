/**
 * Chain-specific limits for event fetching.
 * Add entries here when a chain needs a different limit.
 */
const CHAIN_LIMITS: Partial<Record<number, number>> = {
  // All chains currently use 9999 (the default).
  // Add chain-specific limits here when needed, e.g.:
  // [ChainId.avalanche]: 3000,
};

const DEFAULT_LIMIT = 9999;

/**
 * Returns the event fetching limit for a given chain.
 *
 * @param chainId - The chain ID as a string or number
 * @returns The limit for that chain (defaults to 9999)
 */
export const getLimit = (chainId: string | number): number => {
  return CHAIN_LIMITS[Number(chainId)] ?? DEFAULT_LIMIT;
};
