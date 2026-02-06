import { ChainId, getClient, getLogsRecursive } from "@bgd-labs/toolbox";
import { env } from "process";
import { Abi, AbiEvent, Client, http, getAbiItem, getAddress, Log, createClient, createPublicClient } from "viem";
import { aclManagerAbi } from "../abis/aclManager.js";
import { getBlockNumber } from "viem/actions";
import { crossChainControllerAbi } from "../abis/crossChainControllerAbi.js";

const getHttpConfig = () => {
  return {
    timeout: 30_000,
  } as const;
};

/**
 * Creates a raw viem Client for a custom RPC URL (used for Tenderly forks).
 */
export const getRpcClientFromUrl = (url: string): Client => {
  return createClient({
    transport: http(url),
  });
};

/**
 * Creates the default RPC client for a given chain.
 * Uses @bgd-labs/toolbox's getClient which resolves the RPC URL from env vars
 * (ALCHEMY_KEY, QUICKNODE_ENDPOINT_NAME, QUICKNODE_TOKEN).
 *
 * Avalanche uses a direct QuickNode URL because the toolbox's default
 * Avalanche RPC configuration requires the C-Chain specific path.
 */
export const getRPCClient = (chainId: number): Client => {
  if (chainId === ChainId.avalanche) {
    if (env.QUICKNODE_ENDPOINT_NAME && env.QUICKNODE_TOKEN) {
      return getRpcClientFromUrl(`https://${env.QUICKNODE_ENDPOINT_NAME}.avalanche-mainnet.quiknode.pro/${env.QUICKNODE_TOKEN}/ext/bc/C/rpc`);
    }
  } else if (chainId === ChainId.megaeth) {
    if (env.RPC_MEGAETH) {
      return getRpcClientFromUrl(env.RPC_MEGAETH);
    }
  }

  return getClient(chainId, {
    httpConfig: getHttpConfig(),
    clientConfig: {
      batch: {
        multicall: true,
      },
    },
    providerConfig: {
      alchemyKey: env.ALCHEMY_KEY,
      quicknodeEndpointName: env.QUICKNODE_ENDPOINT_NAME,
      quicknodeToken: env.QUICKNODE_TOKEN,
    }
  });
};

/**
 * Maps event type names to the ABI that defines them.
 * RoleGranted/RoleRevoked come from the ACL Manager (used by all role-based contracts).
 * SenderUpdated comes from the CrossChainController.
 */
const abiByEventType: Record<string, any> = {
  'RoleGranted': aclManagerAbi,
  'RoleRevoked': aclManagerAbi,
  'SenderUpdated': crossChainControllerAbi,
};

/**
 * Extracts the ABI event definition for a given event name.
 */
const getEventTypeAbi = (event: string): AbiEvent => {
  const abi = abiByEventType[event];
  return getAbiItem({
    abi,
    name: event,
  }) as AbiEvent;
};

/**
 * Fetches events from a single contract by paginating through block ranges.
 * The `limit` parameter controls the block range per RPC call to avoid
 * hitting provider limits (varies per chain, see helpers/limits.ts).
 */
export const getEvents = async ({
  client,
  fromBlock,
  contract,
  eventTypes,
  limit,
  maxBlock,
}: {
  client: Client,
  fromBlock: number,
  contract: string,
  eventTypes: string[],
  limit: number,
  maxBlock?: number,
}) => {
  const currentBlock = maxBlock ?? Number(await getBlockNumber(client));
  const eventsAbis = eventTypes.map(getEventTypeAbi);

  const logs: Log[] = [];
  for (let startBlock = fromBlock; startBlock < currentBlock; startBlock += limit) {
    const intervalLogs = await getLogsRecursive({
      client,
      address: getAddress(contract),
      fromBlock: BigInt(startBlock),
      toBlock: BigInt(Math.min(startBlock + limit, currentBlock)),
      events: eventsAbis
    })
    console.log(`chainId: ${client.chain?.id}, startBlock: ${startBlock}, toBlock: ${currentBlock}, maxBlock: ${maxBlock ?? 'null'}, limit: ${limit}, | event: ${eventTypes.join(', ')}, intervalLogs: ${intervalLogs.length}`);
    logs.push(...intervalLogs);
  }

  return { logs, currentBlock: Number(currentBlock) };
}

/**
 * Fetches events from multiple contracts in a single pass.
 * Groups logs by contract address for easy distribution to processors.
 *
 * @param contracts - Array of contract addresses to fetch events from
 * @param eventTypes - Event types to fetch (e.g., ['RoleGranted', 'RoleRevoked'])
 * @returns Map of contract address (lowercase) to its logs, plus the current block number
 */
export const getEventsMultiContract = async ({
  client,
  fromBlock,
  contracts,
  eventTypes,
  limit,
  maxBlock,
}: {
  client: Client,
  fromBlock: number,
  contracts: string[],
  eventTypes: string[],
  limit: number,
  maxBlock?: number,
}): Promise<{ logsByContract: Map<string, Log[]>, currentBlock: number }> => {
  const currentBlock = maxBlock ?? Number(await getBlockNumber(client));
  const eventsAbis = eventTypes.map(getEventTypeAbi);

  // Initialize map with empty arrays for each contract
  const logsByContract = new Map<string, Log[]>();
  for (const contract of contracts) {
    logsByContract.set(contract.toLowerCase(), []);
  }

  // Fetch logs for all contracts
  const contractAddresses = contracts.map(c => getAddress(c));

  for (let startBlock = fromBlock; startBlock < currentBlock; startBlock += limit) {
    const intervalLogs = await getLogsRecursive({
      client,
      address: contractAddresses,
      fromBlock: BigInt(startBlock),
      toBlock: BigInt(Math.min(startBlock + limit, currentBlock)),
      events: eventsAbis
    });

    console.log(`chainId: ${client.chain?.id}, startBlock: ${startBlock}, toBlock: ${currentBlock}, maxBlock: ${maxBlock ?? 'null'}, limit: ${limit}, | events: ${eventTypes.join(', ')}, contracts: ${contracts.length}, intervalLogs: ${intervalLogs.length}`);

    // Distribute logs to their respective contracts
    for (const log of intervalLogs) {
      const contractAddr = log.address.toLowerCase();
      const contractLogs = logsByContract.get(contractAddr);
      if (contractLogs) {
        contractLogs.push(log);
      }
    }
  }

  return { logsByContract, currentBlock };
}