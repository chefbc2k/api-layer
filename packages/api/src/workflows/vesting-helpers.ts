import type { RouteResult } from "../shared/route-types.js";
import { asRecord, hasTransactionHash, readBigInt, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback } from "./reward-campaign-helpers.js";

export { asRecord, hasTransactionHash, readBigInt, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback };

export function isVestingSchedulePresent(value: unknown): boolean {
  const schedule = asRecord(value);
  return schedule !== null && typeof schedule.totalAmount !== "undefined";
}

export function isVestingScheduleRevoked(value: unknown): boolean {
  return asRecord(value)?.revoked === true;
}

export function getReleasedAmount(value: unknown): bigint {
  return readBigInt(asRecord(value)?.releasedAmount);
}

export function getTotalAmount(value: unknown): bigint {
  return readBigInt(asRecord(value)?.totalAmount);
}

export function getReleasableFromSummary(value: unknown): bigint {
  if (Array.isArray(value)) {
    return readBigInt(value[2]);
  }
  const record = asRecord(value);
  if (record) {
    return readBigInt(record.releasable);
  }
  return 0n;
}

export function extractReleasedAmount(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const result = (payload as Record<string, unknown>).result;
  if (typeof result === "string" || typeof result === "number" || typeof result === "bigint") {
    return String(result);
  }
  return null;
}

export function extractReleasedAmountFromLogs(logs: unknown[], txHash: string | null): string | null {
  for (const log of logs) {
    const record = asRecord(log);
    if (record?.transactionHash !== txHash) {
      continue;
    }
    const amount = record.amount;
    if (typeof amount === "string" || typeof amount === "number" || typeof amount === "bigint") {
      return String(amount);
    }
  }
  return null;
}

export async function readVestingState(
  vesting: {
    hasVestingSchedule: (request: unknown) => Promise<RouteResult>;
    getStandardVestingSchedule: (request: unknown) => Promise<RouteResult>;
    getVestingDetails: (request: unknown) => Promise<RouteResult>;
    getVestingReleasableAmount: (request: unknown) => Promise<RouteResult>;
    getVestingTotalAmount: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  beneficiary: string,
) {
  const [exists, schedule, details, releasable, totals] = await Promise.all([
    vesting.hasVestingSchedule({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary],
    }),
    vesting.getStandardVestingSchedule({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary],
    }),
    vesting.getVestingDetails({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary],
    }),
    vesting.getVestingReleasableAmount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary],
    }),
    vesting.getVestingTotalAmount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary],
    }),
  ]);
  return { exists, schedule, details, releasable, totals };
}
