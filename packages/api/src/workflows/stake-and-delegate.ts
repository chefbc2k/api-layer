import { Wallet } from "ethers";
import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import type { RouteResult } from "../shared/route-types.js";
import { createStakingPrimitiveService } from "../modules/staking/primitives/generated/index.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const stakeAndDelegateSchema = z.object({
  amount: z.string().regex(/^\d+$/u),
  delegatee: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

export async function runStakeAndDelegateWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof stakeAndDelegateSchema>,
) {
  const staking = createStakingPrimitiveService(context);
  const tokenomics = createTokenomicsPrimitiveService(context);
  const stakerAddress = await resolveWorkflowStakerAddress(context, auth, walletAddress);
  const spender = context.addressBook.toJSON().diamond;
  const requiredAmount = BigInt(body.amount);

  const allowanceBefore = await waitForWorkflowReadback(
    () => tokenomics.tokenAllowance({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [stakerAddress, spender],
    }),
    (result) => result.statusCode === 200,
    "stakeAndDelegate.allowanceBefore",
  );
  const allowanceBeforeValue = readBigInt(allowanceBefore.body);
  let approval: RouteResult | null = null;
  let approvalTxHash: string | null = null;
  let allowanceAfter = allowanceBefore;

  if (allowanceBeforeValue < requiredAmount) {
    approval = await tokenomics.tokenApprove({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [spender, body.amount],
    });
    approvalTxHash = await waitForWorkflowWriteReceipt(context, approval.body, "stakeAndDelegate.approval");
    allowanceAfter = await waitForWorkflowReadback(
      () => tokenomics.tokenAllowance({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [stakerAddress, spender],
      }),
      (result) => readBigInt(result.body) >= requiredAmount,
      "stakeAndDelegate.allowanceAfter",
    );
  }

  const stakeInfoBefore = await readStakeInfo(staking, auth, walletAddress, stakerAddress);
  const stakeBeforeAmount = readBigInt(asRecord(stakeInfoBefore.body)?.amount);
  const stake = await staking.stake({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.amount],
  }).catch((error: unknown) => {
    throw normalizeStakeExecutionError(error, body.amount);
  });
  const stakeTxHash = await waitForWorkflowWriteReceipt(context, stake.body, "stakeAndDelegate.stake");
  const stakeReceipt = stakeTxHash ? await readWorkflowReceipt(context, stakeTxHash, "stakeAndDelegate.stake") : null;
  const stakeInfoAfter = await waitForWorkflowReadback(
    () => staking.getStakeInfo({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [stakerAddress],
    }),
    (result) => {
      const amount = readBigInt(asRecord(result.body)?.amount);
      return result.statusCode === 200 && amount >= stakeBeforeAmount + requiredAmount;
    },
    "stakeAndDelegate.stakeInfoAfter",
  );
  const stakedEvents = stakeReceipt
    ? await waitForWorkflowEventQuery(
        () => staking.stakedEventQuery({
          auth,
          fromBlock: BigInt(stakeReceipt.blockNumber),
          toBlock: BigInt(stakeReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, stakeTxHash),
        "stakeAndDelegate.stakedEvent",
      )
    : [];

  const delegateBefore = await waitForWorkflowReadback(
    () => staking.delegates({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [stakerAddress],
    }),
    (result) => result.statusCode === 200,
    "stakeAndDelegate.delegateBefore",
  );
  const delegation = await staking.delegate({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.delegatee],
  });
  const delegationTxHash = await waitForWorkflowWriteReceipt(context, delegation.body, "stakeAndDelegate.delegate");
  const delegationReceipt = delegationTxHash ? await readWorkflowReceipt(context, delegationTxHash, "stakeAndDelegate.delegate") : null;
  const delegateAfter = await waitForWorkflowReadback(
    () => staking.delegates({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [stakerAddress],
    }),
    (result) => result.statusCode === 200 && normalizeAddress(result.body) === normalizeAddress(body.delegatee),
    "stakeAndDelegate.delegateAfter",
  );
  const currentVotes = await waitForWorkflowReadback(
    () => staking.getCurrentVotes({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.delegatee],
    }),
    (result) => result.statusCode === 200,
    "stakeAndDelegate.currentVotes",
  );
  const delegateChangedEvents = delegationReceipt
    ? await waitForWorkflowEventQuery(
        () => staking.delegateChangedAddressAddressAddressEventQuery({
          auth,
          fromBlock: BigInt(delegationReceipt.blockNumber),
          toBlock: BigInt(delegationReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, delegationTxHash),
        "stakeAndDelegate.delegateChangedEvent",
      )
    : [];

  return {
    approval: {
      submission: approval?.body ?? null,
      txHash: approvalTxHash,
      spender,
      allowanceBefore: allowanceBefore.body,
      allowanceAfter: allowanceAfter.body,
      source: approval ? "approved" : "existing",
    },
    stake: {
      submission: stake.body,
      txHash: stakeTxHash,
      stakeInfoBefore: stakeInfoBefore.body,
      stakeInfoAfter: stakeInfoAfter.body,
      eventCount: stakedEvents.length,
    },
    delegation: {
      submission: delegation.body,
      txHash: delegationTxHash,
      delegateBefore: delegateBefore.body,
      delegateAfter: delegateAfter.body,
      currentVotes: currentVotes.body,
      eventCount: delegateChangedEvents.length,
    },
    summary: {
      staker: stakerAddress,
      delegatee: body.delegatee,
      amount: body.amount,
    },
  };
}

function normalizeStakeExecutionError(error: unknown, amount: string): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("echoscoretoolow") || text.includes("0xbf5d1cac")) {
    const args = extractUint256Words(text);
    const actual = args[0] ?? "unknown";
    const minimum = args[1] ?? "unknown";
    return new HttpError(
      409,
      `stake-and-delegate blocked by stake rule violation: EchoScore too low (${actual} < ${minimum})`,
      extractDiagnostics(error),
    );
  }
  if (text.includes("belowminimumstake") || text.includes("0x06a35408")) {
    const args = extractUint256Words(text);
    const attempted = args[0] ?? amount;
    const minimum = args[1] ?? "unknown";
    return new HttpError(
      409,
      `stake-and-delegate blocked by stake rule violation: amount ${attempted} is below minimum stake ${minimum}`,
      extractDiagnostics(error),
    );
  }
  if (text.includes("exceedsmaximumstake") || text.includes("0x3265e09b")) {
    const args = extractUint256Words(text);
    const attempted = args[0] ?? amount;
    const maximum = args[1] ?? "unknown";
    return new HttpError(
      409,
      `stake-and-delegate blocked by degraded-mode cap or maximum stake rule: ${attempted} exceeds ${maximum}`,
      extractDiagnostics(error),
    );
  }
  if (text.includes("stakingpaused") || text.includes("0x26d1807b")) {
    return new HttpError(409, "stake-and-delegate requires staking to be unpaused", extractDiagnostics(error));
  }
  if (text.includes("zerostakeamount") || text.includes("0xf69a94d3")) {
    return new HttpError(409, "stake-and-delegate requires a non-zero amount", extractDiagnostics(error));
  }
  return error;
}

function collectErrorText(error: unknown): string {
  const parts = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      parts.add(String(value));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
      visit(nested);
    }
  };
  visit((error as { message?: unknown })?.message ?? error);
  visit((error as { diagnostics?: unknown })?.diagnostics);
  return Array.from(parts).join(" ");
}

function extractDiagnostics(error: unknown): unknown {
  return (error as { diagnostics?: unknown })?.diagnostics;
}

function extractUint256Words(text: string): string[] {
  const blobs = text.match(/0x[0-9a-f]+/g) ?? [];
  for (const blob of blobs) {
    const hex = blob.slice(2);
    if (hex.length < 8 + 64) {
      continue;
    }
    const payload = hex.slice(8);
    const words: string[] = [];
    for (let index = 0; index + 64 <= payload.length; index += 64) {
      const word = payload.slice(index, index + 64);
      try {
        words.push(BigInt(`0x${word}`).toString());
      } catch {
        break;
      }
    }
    if (words.length > 0) {
      return words;
    }
  }
  return [];
}

async function readStakeInfo(
  staking: ReturnType<typeof createStakingPrimitiveService>,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  stakerAddress: string,
) {
  try {
    const result = await staking.getStakeInfo({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [stakerAddress],
    });
    if (result.statusCode === 200) {
      return result;
    }
  } catch {
    // Treat missing prior stake info as zeroed pre-state for workflow confirmation.
  }
  return {
    statusCode: 200,
    body: {
      amount: "0",
    },
  } satisfies RouteResult;
}

async function resolveWorkflowStakerAddress(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
): Promise<string> {
  if (walletAddress) {
    return walletAddress;
  }
  return context.providerRouter.withProvider(
    "read",
    "workflow.stakeAndDelegate.staker",
    async (provider) => {
      const privateKey = requestSignerPrivateKey(auth);
      if (!privateKey) {
        throw new Error("stake-and-delegate requires signer-backed auth");
      }
      return new Wallet(privateKey, provider).getAddress();
    },
  );
}

function requestSignerPrivateKey(auth: import("../shared/auth.js").AuthContext): string | null {
  if (!auth.signerId) {
    return null;
  }
  const raw = process.env.API_LAYER_SIGNER_MAP_JSON;
  if (!raw) {
    return null;
  }
  const signerMap = JSON.parse(raw) as Record<string, string>;
  return signerMap[auth.signerId] ?? null;
}

async function readWorkflowReceipt(
  context: ApiExecutionContext,
  txHash: string,
  label: string,
) {
  const receipt = await context.providerRouter.withProvider(
    "read",
    `workflow.${label}.receipt`,
    (provider) => provider.getTransactionReceipt(txHash),
  );
  if (!receipt) {
    throw new Error(`${label} receipt missing after confirmation: ${txHash}`);
  }
  return receipt;
}

async function waitForWorkflowReadback(
  read: () => Promise<RouteResult>,
  ready: (result: RouteResult) => boolean,
  label: string,
) {
  let lastResult: RouteResult | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await read();
    lastResult = result;
    if (ready(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastResult?.body ?? null)}`);
}

async function waitForWorkflowEventQuery(
  read: () => Promise<unknown[] | RouteResult>,
  ready: (logs: unknown[]) => boolean,
  label: string,
) {
  let lastLogs: unknown[] = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const logs = normalizeEventLogs(await read());
    lastLogs = logs;
    if (ready(logs)) {
      return logs;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} event query timeout: ${JSON.stringify(lastLogs)}`);
}

function hasTransactionHash(logs: unknown[], txHash: string | null): boolean {
  if (!txHash) {
    return false;
  }
  return logs.some((entry) => asRecord(entry)?.transactionHash === txHash);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function normalizeEventLogs(value: unknown[] | RouteResult): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = asRecord(value);
  return Array.isArray(record?.body) ? record.body : [];
}

function readBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/u.test(value)) {
    return BigInt(value);
  }
  return 0n;
}

function normalizeAddress(value: unknown): string | null {
  return typeof value === "string" ? value.toLowerCase() : null;
}
