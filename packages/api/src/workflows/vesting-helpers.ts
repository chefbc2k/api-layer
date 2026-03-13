import { HttpError } from "../shared/errors.js";
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

export function normalizeCreateVestingExecutionError(error: unknown, scheduleKind: string): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("unauthorizeduser") || text.includes("0xa2880f97")) {
    return new HttpError(409, `create-beneficiary-vesting blocked by insufficient caller authority: signer lacks VESTING_MANAGER_ROLE for ${scheduleKind} schedules`, extractDiagnostics(error));
  }
  if (text.includes("insufficientbalance") || text.includes("0xf4d678b8")) {
    return new HttpError(409, "create-beneficiary-vesting requires caller token balance to reserve the vesting amount", extractDiagnostics(error));
  }
  if (text.includes("scheduleexists") || text.includes("0x2ce551cb")) {
    return new HttpError(409, "create-beneficiary-vesting blocked by wrong beneficiary state: beneficiary already has a vesting schedule", extractDiagnostics(error));
  }
  if (text.includes("invalidamount") || text.includes("0x3728b83d")) {
    return new HttpError(409, "create-beneficiary-vesting requires a non-zero amount", extractDiagnostics(error));
  }
  if (text.includes("invalidbeneficiary") || text.includes("0x1a3b45fd")) {
    return new HttpError(409, "create-beneficiary-vesting requires a valid beneficiary address", extractDiagnostics(error));
  }
  return error;
}

export function normalizeReleaseVestingExecutionError(error: unknown): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("noschedulefound") || text.includes("0xaca36dbe")) {
    return new HttpError(409, "release-beneficiary-vesting blocked by wrong beneficiary state: schedule not found", extractDiagnostics(error));
  }
  if (text.includes("alreadyrevoked") || text.includes("0x90315de1")) {
    return new HttpError(409, "release-beneficiary-vesting blocked by wrong beneficiary state: schedule already revoked", extractDiagnostics(error));
  }
  if (text.includes("incliffperiod") || text.includes("0x4b53d0ef")) {
    const args = extractUint256Words(text);
    const cliffEnd = args[1] ?? args[0] ?? "unknown";
    return new HttpError(409, `release-beneficiary-vesting blocked by setup/state: beneficiary is still in cliff period until ${cliffEnd}`, extractDiagnostics(error));
  }
  if (text.includes("nothingtorelease") || text.includes("0x97219316")) {
    return new HttpError(409, "release-beneficiary-vesting blocked by setup/state: no releasable amount", extractDiagnostics(error));
  }
  return error;
}

export function normalizeRevokeVestingExecutionError(error: unknown): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("unauthorizeduser") || text.includes("0xa2880f97")) {
    return new HttpError(409, "revoke-beneficiary-vesting blocked by insufficient caller authority: signer lacks VESTING_MANAGER_ROLE", extractDiagnostics(error));
  }
  if (text.includes("noschedulefound") || text.includes("0xaca36dbe")) {
    return new HttpError(409, "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule not found", extractDiagnostics(error));
  }
  if (text.includes("notrevocable") || text.includes("0x1a899351")) {
    return new HttpError(409, "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule is not revocable", extractDiagnostics(error));
  }
  if (text.includes("alreadyrevoked") || text.includes("0x90315de1")) {
    return new HttpError(409, "revoke-beneficiary-vesting blocked by wrong beneficiary state: schedule already revoked", extractDiagnostics(error));
  }
  return error;
}

export function isAlreadyRevokedError(error: unknown): boolean {
  const text = collectErrorText(error).toLowerCase();
  return text.includes("alreadyrevoked") || text.includes("0x90315de1");
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
  const exists = await vesting.hasVestingSchedule({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [beneficiary],
  });
  if (exists.body !== true) {
    return {
      exists,
      schedule: { statusCode: 200, body: null },
      details: { statusCode: 200, body: null },
      releasable: { statusCode: 200, body: "0" },
      totals: { statusCode: 200, body: { totalVested: "0", totalReleased: "0", releasable: "0" } },
    };
  }

  const [schedule, details] = await Promise.all([
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
  ]);

  const revoked = isVestingScheduleRevoked(schedule.body) || isVestingScheduleRevoked(details.body);

  const releasable = await vesting.getVestingReleasableAmount({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [beneficiary],
  }).catch((error: unknown) => {
    if (revoked && isAlreadyRevokedError(error)) {
      return { statusCode: 200, body: "0" };
    }
    throw error;
  });

  const totals = await vesting.getVestingTotalAmount({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [beneficiary],
  }).catch((error: unknown) => {
    if (revoked && isAlreadyRevokedError(error)) {
      return { statusCode: 200, body: { totalVested: "0", totalReleased: "0", releasable: "0" } };
    }
    throw error;
  });

  return { exists, schedule, details, releasable, totals };
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
