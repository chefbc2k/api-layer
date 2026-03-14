import { toBeHex } from "ethers";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import type { RouteResult } from "../shared/route-types.js";

export const ZERO_BYTES32 = `0x${"0".repeat(64)}`;

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

export function readTemplateHashFromPayload(payload: unknown): string | null {
  const scalar = extractScalarResult(payload);
  return typeof scalar === "string" && /^0x[a-fA-F0-9]{64}$/u.test(scalar) ? scalar : null;
}

export function decimalTemplateIdToHash(templateId: string): string {
  return toBeHex(BigInt(templateId), 32);
}

export function templateHashToDecimal(templateHash: string): string {
  return BigInt(templateHash).toString();
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
  read: () => Promise<unknown[] | RouteResult>,
  ready: (logs: unknown[]) => boolean,
  label: string,
) {
  let lastLogs: unknown[] = [];
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const logs = normalizeEventLogs(await read());
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

export function collaboratorReadMatches(
  value: unknown,
  expectedActive: boolean,
  expectedShare: string,
): boolean {
  const record = asRecord(value);
  if (record) {
    return record.isActive === expectedActive && String(record.share ?? "") === expectedShare;
  }
  if (Array.isArray(value)) {
    return value[0] === expectedActive && String(value[1] ?? "") === expectedShare;
  }
  return false;
}

export function normalizeEventLogs(value: unknown[] | RouteResult): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const record = asRecord(value);
  return Array.isArray(record?.body) ? record.body : [];
}
