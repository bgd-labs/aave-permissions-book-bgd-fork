import { spawn, execSync, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import {
  createTestClient,
  http,
  publicActions,
  walletActions,
  getContract,
  parseEther,
  encodeAbiParameters,
  type Address,
} from 'viem';
import { PayloadsController_ABI } from '../abis/payloadsController.js';

// ============================================================================
// Types
// ============================================================================

export interface AnvilFork {
  rpcUrl: string;
  forkBlockNumber: number;
  stop: () => Promise<void>;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Checks that Anvil binary is available.
 * Throws with install instructions if missing.
 */
export async function checkAnvilInstalled(): Promise<void> {
  try {
    execSync('anvil --version', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'Anvil is not installed. Install it with: npm install -D @foundry-rs/anvil\n' +
        'Or install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup',
    );
  }
}

/**
 * Starts an Anvil fork at a specific block.
 */
export async function startAnvilFork(
  chainRpcUrl: string,
  forkBlockNumber: number,
): Promise<AnvilFork> {
  const port = await getAvailablePort();

  const child = spawn('anvil', [
    '--fork-url', chainRpcUrl,
    '--fork-block-number', String(forkBlockNumber),
    '--port', String(port),
  ], {
    stdio: 'ignore',
    detached: false,
  });

  // Kill Anvil if the parent process exits unexpectedly
  const exitHandler = () => {
    try { child.kill('SIGTERM'); } catch {}
  };
  process.on('exit', exitHandler);

  const rpcUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForAnvilReady(rpcUrl, 30_000);
  } catch (err) {
    child.kill('SIGTERM');
    process.removeListener('exit', exitHandler);
    throw err;
  }

  const stop = async () => {
    child.kill('SIGTERM');
    process.removeListener('exit', exitHandler);
    // Wait for process to exit
    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
      // If already dead, resolve immediately
      if (child.killed) resolve();
    });
  };

  return { rpcUrl, forkBlockNumber, stop };
}

// PayloadState enum from the PayloadsController contract
const PayloadState = {
  None: 0,
  Created: 1,
  Queued: 2,
  Executed: 3,
  Cancelled: 4,
  Expired: 5,
} as const;

const PAYLOAD_STATE_NAMES: Record<number, string> = {
  [PayloadState.None]: 'None',
  [PayloadState.Created]: 'Created',
  [PayloadState.Queued]: 'Queued',
  [PayloadState.Executed]: 'Executed',
  [PayloadState.Cancelled]: 'Cancelled',
  [PayloadState.Expired]: 'Expired',
};

/**
 * Executes a payload on a running Anvil fork.
 *
 * Handles all possible payload states:
 * - Not registered: creates, queues, advances time, executes
 * - Created: queues, advances time, executes
 * - Queued: advances time, executes
 * - Executed: throws (fork not needed)
 * - Cancelled/Expired: throws (payload cannot be executed)
 */
export async function executePayloadOnFork(
  anvilRpcUrl: string,
  payloadsControllerAddress: string,
  payloadAddress: string,
  accessLevel: number = 1,
): Promise<void> {
  const client = createTestClient({
    mode: 'anvil',
    transport: http(anvilRpcUrl),
  })
    .extend(publicActions)
    .extend(walletActions);

  const pcAddress = payloadsControllerAddress as Address;
  const defaultAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as Address; // Anvil default funded account

  const payloadsController = getContract({
    address: pcAddress,
    abi: PayloadsController_ABI,
    client,
  });

  // Find if this payload address is already registered
  const { payloadId, state: currentState } = await findPayload(
    payloadsController,
    payloadAddress,
  );

  let id = payloadId;
  let state = currentState;

  // Handle based on current state
  if (state === PayloadState.Executed) {
    throw new Error(
      `Payload ${payloadAddress} (id: ${id}) is already executed. Fork is not needed.`,
    );
  }

  if (state === PayloadState.Cancelled || state === PayloadState.Expired) {
    throw new Error(
      `Payload ${payloadAddress} (id: ${id}) is ${PAYLOAD_STATE_NAMES[state]}. Cannot execute.`,
    );
  }

  // Step 1: Create payload if not registered
  if (state === PayloadState.None) {
    console.log(`Payload not registered, creating...`);
    await client.writeContract({
      chain: null,
      account: defaultAccount,
      address: pcAddress,
      abi: PayloadsController_ABI,
      functionName: 'createPayload',
      args: [
        [{
          target: payloadAddress as Address,
          withDelegateCall: true,
          accessLevel,
          value: 0n,
          signature: 'execute()',
          callData: '0x' as `0x${string}`,
        }],
      ],
    });

    const payloadsCount = await payloadsController.read.getPayloadsCount() as number;
    id = payloadsCount - 1;
    state = PayloadState.Created;
    console.log(`Payload created with id: ${id}`);
  }

  // Step 2: Queue via receiveCrossChainMessage if Created
  if (state === PayloadState.Created) {
    console.log(`Payload ${id} is Created, queueing...`);
    const ccc = await payloadsController.read.CROSS_CHAIN_CONTROLLER() as Address;
    const originator = await payloadsController.read.MESSAGE_ORIGINATOR() as Address;
    const originChainId = await payloadsController.read.ORIGIN_CHAIN_ID() as bigint;

    // Read the payload's access level from the contract if it was already registered
    if (payloadId !== -1) {
      const payload = await payloadsController.read.getPayloadById([id]) as { maximumAccessLevelRequired: number };
      accessLevel = Number(payload.maximumAccessLevelRequired);
    }

    await client.impersonateAccount({ address: ccc });
    await client.setBalance({ address: ccc, value: parseEther('10') });

    const message = encodeAbiParameters(
      [{ type: 'uint40' }, { type: 'uint8' }, { type: 'uint40' }],
      [id, accessLevel, 0],
    );

    await client.writeContract({
      chain: null,
      account: ccc,
      address: pcAddress,
      abi: PayloadsController_ABI,
      functionName: 'receiveCrossChainMessage',
      args: [originator, originChainId, message],
    });

    await client.stopImpersonatingAccount({ address: ccc });
    state = PayloadState.Queued;
    console.log(`Payload ${id} queued`);
  }

  // Step 3: Advance time past execution delay if Queued
  if (state === PayloadState.Queued) {
    console.log(`Payload ${id} is Queued, advancing time and executing...`);
    await client.increaseTime({ seconds: 86400 + 7200 });
    await client.mine({ blocks: 1 });

    // Step 4: Execute
    await client.writeContract({
      chain: null,
      account: defaultAccount,
      address: pcAddress,
      abi: PayloadsController_ABI,
      functionName: 'executePayload',
      args: [id],
    });
  }

  // Step 5: Validate execution succeeded
  const finalState = await payloadsController.read.getPayloadState([id]) as number;
  if (Number(finalState) !== PayloadState.Executed) {
    throw new Error(
      `Payload execution failed: expected state Executed (3), got ${finalState} (${PAYLOAD_STATE_NAMES[finalState] ?? 'Unknown'})`,
    );
  }

  console.log(`Payload ${payloadAddress} executed successfully (id: ${id})`);
}

/**
 * Searches existing payloads in the PayloadsController for one that contains
 * the given payload address as a target action.
 *
 * Returns the payloadId and state if found, or { payloadId: -1, state: None } if not.
 */
async function findPayload(
  payloadsController: ReturnType<typeof getContract>,
  payloadAddress: string,
): Promise<{ payloadId: number; state: number }> {
  const count = await payloadsController.read.getPayloadsCount() as number;
  const normalizedTarget = payloadAddress.toLowerCase();

  // Search backwards (most recent first) for efficiency
  for (let i = count - 1; i >= 0; i--) {
    const payload = await payloadsController.read.getPayloadById([i]) as {
      state: number;
      actions: Array<{ target: string }>;
    };

    const hasTarget = payload.actions.some(
      (action) => action.target.toLowerCase() === normalizedTarget,
    );

    if (hasTarget) {
      return { payloadId: i, state: Number(payload.state) };
    }
  }

  return { payloadId: -1, state: PayloadState.None };
}

// ============================================================================
// Internal helpers
// ============================================================================

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Could not get available port')));
      }
    });
    server.on('error', reject);
  });
}

async function waitForAnvilReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1,
        }),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Anvil did not start within ${timeoutMs}ms`);
}
