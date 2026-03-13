import { Wallet } from "ethers";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import type { RouteResult } from "../shared/route-types.js";

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function extractScalarResult(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const result = (payload as Record<string, unknown>).result;
  if (typeof result === "string") {
    return result;
  }
  if (typeof result === "number" || typeof result === "bigint") {
    return String(result);
  }
  return null;
}

export function readBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/u.test(value)) {
    return BigInt(value);
  }
  return 0n;
}

export function normalizeAddress(value: unknown): string | null {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/u.test(value) ? value.toLowerCase() : null;
}

export async function resolveWorkflowAccountAddress(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  label: string,
): Promise<string> {
  if (walletAddress) {
    return walletAddress;
  }
  return context.providerRouter.withProvider(
    "read",
    `workflow.${label}.account`,
    async (provider) => {
      const privateKey = requestSignerPrivateKey(auth);
      if (!privateKey) {
        throw new Error(`${label} requires signer-backed auth`);
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

export async function readWorkflowReceipt(
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

export async function waitForWorkflowReadback(
  read: () => Promise<RouteResult>,
  ready: (result: RouteResult) => boolean,
  label: string,
) {
  let lastResult: RouteResult | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const result = await read();
      lastResult = result;
      if (ready(result)) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${String((lastError as { message?: string })?.message ?? JSON.stringify(lastResult?.body ?? null))}`);
}

export async function waitForWorkflowEventQuery(
  read: () => Promise<unknown[]>,
  ready: (logs: unknown[]) => boolean,
  label: string,
) {
  let lastLogs: unknown[] = [];
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const logs = await read();
      lastLogs = logs;
      if (ready(logs)) {
        return logs;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} event query timeout: ${String((lastError as { message?: string })?.message ?? JSON.stringify(lastLogs))}`);
}

export function hasTransactionHash(logs: unknown[], txHash: string | null): boolean {
  if (!txHash) {
    return false;
  }
  return logs.some((entry) => asRecord(entry)?.transactionHash === txHash);
}

export function extractCampaignIdFromLogs(logs: unknown[], txHash: string | null): string | null {
  const matchingLog = findLogByTransactionHash(logs, txHash);
  const campaignId = matchingLog?.campaignId;
  if (typeof campaignId === "string" || typeof campaignId === "number" || typeof campaignId === "bigint") {
    return String(campaignId);
  }
  return null;
}

export function extractClaimedAmountFromLogs(logs: unknown[], txHash: string | null): string | null {
  const matchingLog = findLogByTransactionHash(logs, txHash);
  const amount = matchingLog?.amount;
  if (typeof amount === "string" || typeof amount === "number" || typeof amount === "bigint") {
    return String(amount);
  }
  return null;
}

function findLogByTransactionHash(logs: unknown[], txHash: string | null): Record<string, unknown> | null {
  if (!txHash) {
    return null;
  }
  for (const entry of logs) {
    const record = asRecord(entry);
    if (record?.transactionHash === txHash) {
      return record;
    }
  }
  return null;
}
