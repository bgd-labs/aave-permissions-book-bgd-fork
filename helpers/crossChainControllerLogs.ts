import { ParseEventLogsReturnType } from 'viem';
import { crossChainControllerAbi } from '../abis/crossChainControllerAbi.js';

// Properly typed log from the CrossChainController ABI
type SenderUpdatedLog = ParseEventLogsReturnType<typeof crossChainControllerAbi, undefined, true, 'SenderUpdated'>[number];

/**
 * Processes SenderUpdated events to determine current approved senders.
 *
 * This is a pure function that takes event logs and returns the computed senders.
 * It does NOT make any RPC calls.
 *
 * @param oldSenders - Previously known approved senders (from saved JSON)
 * @param eventLogs - Array of SenderUpdated event logs
 * @returns Updated list of approved senders
 */
export const getSenders = ({
  oldSenders,
  eventLogs,
}: {
  oldSenders: string[];
  eventLogs: SenderUpdatedLog[];
}): string[] => {
  const senders = new Set<string>(oldSenders);

  for (const eventLog of eventLogs) {
    const { sender, isApproved } = eventLog.args;

    if (eventLog.eventName === 'SenderUpdated') {
      if (isApproved) {
        senders.add(sender);
      } else {
        senders.delete(sender);
      }
    }
  }

  return Array.from(senders);
};
