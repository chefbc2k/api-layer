import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import type { RouteResult } from "../shared/route-types.js";
import type { createEmergencyPrimitiveService } from "../modules/emergency/primitives/generated/index.js";
import {
  asRecord,
  hasTransactionHash,
  normalizeEventLogs,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./rights-licensing-helpers.js";

export { asRecord, hasTransactionHash, normalizeEventLogs, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback };

export const digitsSchema = z.string().regex(/^\d+$/u);
export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
export const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
export const bytesSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/u);

export const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

type EmergencyService = ReturnType<typeof createEmergencyPrimitiveService>;

export function resolveActorOverride(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  actor: z.infer<typeof actorOverrideSchema> | undefined,
  workflowName: string,
  label: string,
) {
  if (!actor) {
    return { auth, walletAddress };
  }
  const childAuth = context.apiKeys[actor.apiKey];
  if (!childAuth) {
    throw new HttpError(400, `${workflowName} received unknown ${label} apiKey`);
  }
  return {
    auth: childAuth,
    walletAddress: actor.walletAddress ?? walletAddress,
  };
}

export function readScalarBody(body: unknown): string | null {
  if (typeof body === "string") {
    return body;
  }
  if (typeof body === "number" || typeof body === "bigint") {
    return String(body);
  }
  const record = asRecord(body);
  const result = record?.result;
  if (typeof result === "string") {
    return result;
  }
  if (typeof result === "number" || typeof result === "bigint") {
    return String(result);
  }
  return null;
}

export function readBooleanBody(body: unknown): boolean | null {
  if (typeof body === "boolean") {
    return body;
  }
  const record = asRecord(body);
  const result = record?.result;
  return typeof result === "boolean" ? result : null;
}

export function readArrayBody(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  const record = asRecord(body);
  return Array.isArray(record?.body)
    ? record.body
    : Array.isArray(record?.result)
      ? record.result
      : [];
}

export function mapEmergencyStateLabel(value: string | null): string {
  switch (value) {
    case "0":
      return "NORMAL";
    case "1":
      return "PAUSED";
    case "2":
      return "LOCKED_DOWN";
    case "3":
      return "RECOVERY";
    default:
      return "UNKNOWN";
  }
}

export function mapIncidentTypeLabel(value: string | null): string {
  switch (value) {
    case "0":
      return "SECURITY_BREACH";
    case "1":
      return "SMART_CONTRACT_BUG";
    case "2":
      return "MARKET_MANIPULATION";
    case "3":
      return "SYSTEM_FAILURE";
    case "4":
      return "EXTERNAL_THREAT";
    case "5":
      return "GOVERNANCE_ATTACK";
    case "6":
      return "ASSET_COMPROMISE";
    default:
      return "UNKNOWN";
  }
}

export function mapResponseActionLabel(value: string): string {
  switch (value) {
    case "0":
      return "PAUSE_TRADING";
    case "1":
      return "FREEZE_ASSETS";
    case "2":
      return "LOCK_TRANSFERS";
    case "3":
      return "ENABLE_RECOVERY";
    case "4":
      return "RESTORE_STATE";
    case "5":
      return "ROLLBACK_CHANGES";
    default:
      return "UNKNOWN";
  }
}

export async function readEmergencyPosture(
  emergency: EmergencyService,
  auth: AuthContext,
  walletAddress: string | undefined,
) {
  const [state, stopped, timeout] = await Promise.all([
    emergency.getEmergencyState({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    emergency.isEmergencyStopped({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    emergency.getEmergencyTimeout({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
  ]);

  const stateCode = readScalarBody(state.body);
  return {
    currentState: stateCode,
    currentStateLabel: mapEmergencyStateLabel(stateCode),
    isEmergencyStopped: readBooleanBody(stopped.body),
    emergencyTimeout: readScalarBody(timeout.body),
  };
}

export function readIncidentSummary(body: unknown) {
  const record = asRecord(body);
  const incidentType = readScalarBody(record?.incidentType);
  const actions = Array.isArray(record?.actions)
    ? record.actions.map((entry) => String(entry))
    : [];
  const approvers = Array.isArray(record?.approvers)
    ? record.approvers.filter((entry): entry is string => typeof entry === "string")
    : [];
  return {
    id: readScalarBody(record?.id),
    incidentType,
    incidentTypeLabel: mapIncidentTypeLabel(incidentType),
    description: typeof record?.description === "string" ? record.description : null,
    reporter: typeof record?.reporter === "string" ? record.reporter : null,
    timestamp: readScalarBody(record?.timestamp),
    resolved: typeof record?.resolved === "boolean" ? record.resolved : null,
    actions,
    actionLabels: actions.map(mapResponseActionLabel),
    approvers,
    resolutionTime: readScalarBody(record?.resolutionTime),
  };
}

export function readRecoveryPlanSummary(body: unknown) {
  const tuple = readArrayBody(body);
  const steps = Array.isArray(tuple[0]) ? tuple[0].map((entry) => String(entry)) : [];
  const approvedByGovernance = typeof tuple[1] === "boolean" ? tuple[1] : null;
  const startTime = readScalarBody(tuple[2]);
  const completionTime = readScalarBody(tuple[3]);
  const approvalCount = readScalarBody(tuple[4]);
  const results = Array.isArray(tuple[5]) ? tuple[5].map((entry) => String(entry)) : [];

  return {
    steps,
    approvedByGovernance,
    startTime,
    completionTime,
    approvalCount,
    results,
    phase: deriveRecoveryPhase({
      approvedByGovernance,
      startTime,
      completionTime,
      steps,
      results,
    }),
  };
}

export function deriveRecoveryPhase(value: {
  approvedByGovernance: boolean | null,
  startTime: string | null,
  completionTime: string | null,
  steps: string[],
  results: string[],
}) {
  if (value.completionTime && value.completionTime !== "0") {
    return "completed";
  }
  if (value.startTime && value.startTime !== "0") {
    return value.results.length >= value.steps.length && value.steps.length > 0
      ? "ready-to-complete"
      : "executing";
  }
  if (value.approvedByGovernance === true) {
    return "approved-awaiting-start";
  }
  if (value.steps.length > 0) {
    return "awaiting-approval";
  }
  return "not-started";
}

export async function waitForEmergencyState(
  emergency: EmergencyService,
  auth: AuthContext,
  walletAddress: string | undefined,
  expected: string[],
  label: string,
) {
  const result = await waitForWorkflowReadback(
    () => emergency.getEmergencyState({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (response) => {
      const state = readScalarBody(response.body);
      return state !== null && expected.includes(state);
    },
    label,
  );
  const stateCode = readScalarBody(result.body);
  return {
    state: stateCode,
    stateLabel: mapEmergencyStateLabel(stateCode),
  };
}

export function normalizeEmergencyExecutionError(
  error: unknown,
  workflowName: string,
  label: string,
): unknown {
  if (error instanceof HttpError) {
    return error;
  }
  const message = String((error as { message?: string })?.message ?? error);
  const diagnostics = (error as { diagnostics?: unknown })?.diagnostics;
  const lower = message.toLowerCase();

  if (
    lower.includes("notauthorized") ||
    lower.includes("notemergencyadmin") ||
    lower.includes("caller not owner") ||
    lower.includes("emergency_admin") ||
    lower.includes("withdraWal_approval".toLowerCase()) ||
    lower.includes("fee_manager") ||
    lower.includes("recoveryapprover")
  ) {
    return new HttpError(409, `${workflowName} blocked by insufficient authority: ${message}`, diagnostics);
  }
  if (
    lower.includes("alreadyapproved") ||
    lower.includes("alreadyexecuted") ||
    lower.includes("alreadypaused") ||
    lower.includes("incidentalreadyresolved") ||
    lower.includes("recoverynotstarted") ||
    lower.includes("timelockactive") ||
    lower.includes("invalidrequest") ||
    lower.includes("invalidincidentid") ||
    lower.includes("invalidemergencystate") ||
    lower.includes("invalidtimestamp") ||
    lower.includes("notpaused") ||
    lower.includes("cannotexecute") ||
    lower.includes("notwhitelisted") ||
    lower.includes("assetnotfrozen") ||
    lower.includes("needsgovernanceapproval")
  ) {
    return new HttpError(409, `${workflowName} blocked by setup/state at ${label}: ${message}`, diagnostics);
  }
  return error;
}

export function normalizeRequestId(value: unknown): string | null {
  const scalar = readScalarBody(value);
  return typeof scalar === "string" && /^0x[a-fA-F0-9]{64}$/u.test(scalar) ? scalar : null;
}

export function buildEventWindow(receipt: { blockNumber: bigint | number | string }) {
  const block = BigInt(receipt.blockNumber);
  return {
    fromBlock: block,
    toBlock: block,
  };
}

export function asRouteResult(body: unknown): RouteResult {
  return { statusCode: 200, body };
}
