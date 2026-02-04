import { Client, Log } from 'viem';
import { getEventsMultiContract, getRpcClientFromUrl } from './rpc.js';
import { getLimit } from './limits.js';
import { getTenderlyConfig, isTenderlyPool } from './poolHelpers.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for a contract whose events should be indexed.
 */
export interface ContractEventConfig {
  /** Unique identifier for this contract (e.g., 'ACL_MANAGER', 'COLLECTOR') */
  id: string;
  /** Contract address */
  address: string;
  /** Block number when the contract was deployed */
  deploymentBlock: number;
  /** Event types to fetch for this contract */
  eventTypes: string[];
}

/**
 * Metadata for a single indexed contract.
 */
export interface IndexedContractInfo {
  address: string;
  deploymentBlock: number;
  firstIndexedAt: number;
}

/**
 * Metadata for a pool's indexed contracts.
 */
export interface PoolMetadata {
  latestBlockNumber: number;
  indexedContracts: Record<string, IndexedContractInfo>;
}

/**
 * Network-level metadata containing all pools.
 */
export type NetworkMetadata = Record<string, PoolMetadata>;

/**
 * Result of indexing events for a pool.
 */
export interface IndexingResult {
  /** Events grouped by contract ID (not address) */
  eventsByContract: Record<string, Log[]>;
  /** The block number we indexed up to */
  latestBlockNumber: number;
  /** Updated metadata for this pool */
  poolMetadata: PoolMetadata;
}

// ============================================================================
// Core Indexing Functions
// ============================================================================

/**
 * Groups contracts by their effective fromBlock for efficient batching.
 * Contracts with the same fromBlock can be fetched together.
 */
const groupContractsByFromBlock = (
  contracts: Array<ContractEventConfig & { effectiveFromBlock: number }>,
): Map<number, typeof contracts> => {
  const groups = new Map<number, typeof contracts>();

  for (const contract of contracts) {
    const key = contract.effectiveFromBlock;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(contract);
  }

  return groups;
};

/**
 * Determines the effective fromBlock for each contract.
 * - New contracts (not in metadata): use deploymentBlock
 * - Existing contracts: use latestBlockNumber from metadata
 */
const resolveEffectiveFromBlocks = (
  contracts: ContractEventConfig[],
  poolMetadata: PoolMetadata | undefined,
): Array<ContractEventConfig & { effectiveFromBlock: number }> => {
  const savedLatestBlock = poolMetadata?.latestBlockNumber ?? 0;

  return contracts.map((contract) => {
    const indexed = poolMetadata?.indexedContracts[contract.id];

    // If not indexed before, start from deployment block
    // If indexed before, start from where we left off
    const effectiveFromBlock = indexed ? savedLatestBlock : contract.deploymentBlock;

    return { ...contract, effectiveFromBlock };
  });
};

/**
 * Indexes events for a pool's contracts using unified fetching.
 *
 * This function:
 * 1. Determines the effective fromBlock for each contract
 * 2. Groups contracts by fromBlock for efficient batching
 * 3. Fetches events for each group in a single RPC call
 * 4. Distributes events to their respective contracts
 * 5. Returns events grouped by contract ID and updated metadata
 */
export const indexPoolEvents = async ({
  client,
  chainId,
  poolKey,
  contracts,
  poolMetadata,
}: {
  client: Client;
  chainId: string;
  poolKey: string;
  contracts: ContractEventConfig[];
  poolMetadata: PoolMetadata | undefined;
}): Promise<IndexingResult> => {
  const limit = getLimit(chainId);
  const tenderlyConfig = getTenderlyConfig(chainId, poolKey);

  // Filter out contracts with no address
  const validContracts = contracts.filter((c) => c.address);

  if (validContracts.length === 0) {
    return {
      eventsByContract: {},
      latestBlockNumber: poolMetadata?.latestBlockNumber ?? 0,
      poolMetadata: poolMetadata ?? { latestBlockNumber: 0, indexedContracts: {} },
    };
  }

  // Determine effective fromBlock for each contract
  const contractsWithFromBlock = resolveEffectiveFromBlocks(validContracts, poolMetadata);

  // Group contracts by their effective fromBlock
  const byFromBlock = groupContractsByFromBlock(contractsWithFromBlock);

  // Initialize result
  const eventsByContract: Record<string, Log[]> = {};
  for (const contract of validContracts) {
    eventsByContract[contract.id] = [];
  }

  let latestBlockNumber = poolMetadata?.latestBlockNumber ?? 0;

  // Handle Tenderly pools: fetch from mainnet up to fork block, then from fork
  if (isTenderlyPool(poolKey) && tenderlyConfig) {
    // Fetch events from mainnet up to the Tenderly fork block
    for (const [fromBlock, contractGroup] of byFromBlock) {
      if (fromBlock >= tenderlyConfig.tenderlyBlock) continue;

      const addresses = contractGroup.map((c) => c.address);
      const eventTypes = [...new Set(contractGroup.flatMap((c) => c.eventTypes))];

      const { logsByContract, currentBlock } = await getEventsMultiContract({
        client,
        fromBlock,
        contracts: addresses,
        eventTypes,
        limit,
        maxBlock: tenderlyConfig.tenderlyBlock,
      });

      // Distribute logs to their respective contracts by ID
      for (const contract of contractGroup) {
        const logs = logsByContract.get(contract.address.toLowerCase()) ?? [];
        eventsByContract[contract.id].push(...logs);
      }

      latestBlockNumber = Math.max(latestBlockNumber, currentBlock);
    }

    // Fetch events from the Tenderly fork
    const tenderlyProvider = getRpcClientFromUrl(tenderlyConfig.tenderlyRpcUrl);
    const allAddresses = validContracts.map((c) => c.address);
    const allEventTypes = [...new Set(validContracts.flatMap((c) => c.eventTypes))];

    const { logsByContract: tenderlyLogs } = await getEventsMultiContract({
      client: tenderlyProvider,
      fromBlock: tenderlyConfig.tenderlyBlock,
      contracts: allAddresses,
      eventTypes: allEventTypes,
      limit: 999,
    });

    // Distribute Tenderly logs
    for (const contract of validContracts) {
      const logs = tenderlyLogs.get(contract.address.toLowerCase()) ?? [];
      eventsByContract[contract.id].push(...logs);
    }
  } else {
    // Regular pool: fetch all events
    for (const [fromBlock, contractGroup] of byFromBlock) {
      const addresses = contractGroup.map((c) => c.address);
      const eventTypes = [...new Set(contractGroup.flatMap((c) => c.eventTypes))];

      const { logsByContract, currentBlock } = await getEventsMultiContract({
        client,
        fromBlock,
        contracts: addresses,
        eventTypes,
        limit,
      });

      // Distribute logs to their respective contracts by ID
      for (const contract of contractGroup) {
        const logs = logsByContract.get(contract.address.toLowerCase()) ?? [];
        eventsByContract[contract.id].push(...logs);
      }

      latestBlockNumber = Math.max(latestBlockNumber, currentBlock);
    }
  }

  // Build updated metadata
  const updatedIndexedContracts: Record<string, IndexedContractInfo> = {
    ...(poolMetadata?.indexedContracts ?? {}),
  };

  for (const contract of validContracts) {
    if (!updatedIndexedContracts[contract.id]) {
      updatedIndexedContracts[contract.id] = {
        address: contract.address,
        deploymentBlock: contract.deploymentBlock,
        firstIndexedAt: contract.deploymentBlock,
      };
    }
  }

  return {
    eventsByContract,
    latestBlockNumber,
    poolMetadata: {
      latestBlockNumber,
      indexedContracts: updatedIndexedContracts,
    },
  };
};

// ============================================================================
// Contract Config Builder
// ============================================================================

/**
 * Standard event types for role-based contracts (ACL, Collector, etc.)
 */
export const ROLE_EVENT_TYPES = ['RoleGranted', 'RoleRevoked'];

/**
 * Event types for CrossChainController
 */
export const CCC_EVENT_TYPES = ['SenderUpdated'];

/**
 * Pool configuration for building contract configs.
 */
interface PoolConfig {
  addressBook: Record<string, string>;
  umbrellaAddressBook?: Record<string, string>;
  governanceAddressBook?: Record<string, string>;
  // V3 blocks
  aclBlock?: number;
  collectorBlock?: number;
  clinicStewardBlock?: number;
  umbrellaBlock?: number;
  umbrellaIncentivesBlock?: number;
  crossChainControllerBlock?: number;
  granularGuardianBlock?: number;
  // GHO blocks
  ghoBlock?: number;
  gsmBlocks?: Record<string, number>;
}

/**
 * Builds contract configs for all event-emitting contracts in a pool.
 * Handles V3 contracts, GHO contracts, and governance contracts in a single call.
 */
export const buildPoolContractConfigs = (pool: PoolConfig): ContractEventConfig[] => {
  const configs: ContractEventConfig[] = [];

  // ===== V3 Contracts =====

  // ACL_MANAGER
  if (pool.addressBook.ACL_MANAGER && pool.aclBlock) {
    configs.push({
      id: 'ACL_MANAGER',
      address: pool.addressBook.ACL_MANAGER,
      deploymentBlock: pool.aclBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // COLLECTOR
  if (pool.addressBook.COLLECTOR && pool.collectorBlock) {
    configs.push({
      id: 'COLLECTOR',
      address: pool.addressBook.COLLECTOR,
      deploymentBlock: pool.collectorBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // CLINIC_STEWARD
  if (pool.addressBook.CLINIC_STEWARD && pool.clinicStewardBlock) {
    configs.push({
      id: 'CLINIC_STEWARD',
      address: pool.addressBook.CLINIC_STEWARD,
      deploymentBlock: pool.clinicStewardBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // ===== Umbrella Contracts =====

  // UMBRELLA
  if (pool.umbrellaAddressBook?.UMBRELLA && pool.umbrellaBlock) {
    configs.push({
      id: 'UMBRELLA',
      address: pool.umbrellaAddressBook.UMBRELLA,
      deploymentBlock: pool.umbrellaBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // UMBRELLA_REWARDS_CONTROLLER
  if (pool.umbrellaAddressBook?.UMBRELLA_REWARDS_CONTROLLER && pool.umbrellaIncentivesBlock) {
    configs.push({
      id: 'UMBRELLA_REWARDS_CONTROLLER',
      address: pool.umbrellaAddressBook.UMBRELLA_REWARDS_CONTROLLER,
      deploymentBlock: pool.umbrellaIncentivesBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // ===== Governance Contracts =====

  // CROSS_CHAIN_CONTROLLER
  if (pool.governanceAddressBook?.CROSS_CHAIN_CONTROLLER && pool.crossChainControllerBlock) {
    configs.push({
      id: 'CROSS_CHAIN_CONTROLLER',
      address: pool.governanceAddressBook.CROSS_CHAIN_CONTROLLER,
      deploymentBlock: pool.crossChainControllerBlock,
      eventTypes: CCC_EVENT_TYPES,
    });
  }

  // GRANULAR_GUARDIAN
  if (pool.governanceAddressBook?.GRANULAR_GUARDIAN && pool.granularGuardianBlock) {
    configs.push({
      id: 'GRANULAR_GUARDIAN',
      address: pool.governanceAddressBook.GRANULAR_GUARDIAN,
      deploymentBlock: pool.granularGuardianBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // ===== GHO Contracts =====

  // GHO_TOKEN
  if (pool.addressBook.GHO_TOKEN && pool.ghoBlock) {
    configs.push({
      id: 'GHO_TOKEN',
      address: pool.addressBook.GHO_TOKEN,
      deploymentBlock: pool.ghoBlock,
      eventTypes: ROLE_EVENT_TYPES,
    });
  }

  // GSM contracts (GsmUsdc, GsmUsdt, etc.)
  if (pool.gsmBlocks) {
    for (const [gsmKey, gsmBlock] of Object.entries(pool.gsmBlocks)) {
      if (pool.addressBook[gsmKey]) {
        configs.push({
          id: gsmKey,
          address: pool.addressBook[gsmKey],
          deploymentBlock: gsmBlock,
          eventTypes: ROLE_EVENT_TYPES,
        });
      }
    }
  }

  return configs;
};
