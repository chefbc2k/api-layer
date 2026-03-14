import { Interface } from "ethers";
import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createDiamondAdminPrimitiveService } from "../modules/diamond-admin/primitives/generated/index.js";
import { createMultisigPrimitiveService } from "../modules/multisig/primitives/generated/index.js";
import { createOwnershipPrimitiveService } from "../modules/ownership/primitives/generated/index.js";
import {
  asRecord,
  hasTransactionHash,
  normalizeEventLogs,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./rights-licensing-helpers.js";

export const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
export const bytesSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/u);
export const bytes4Schema = z.string().regex(/^0x[a-fA-F0-9]{8}$/u);
export const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
export const digitsSchema = z.string().regex(/^\d+$/u);

export const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

export const facetCutSchema = z.object({
  facetAddress: addressSchema,
  action: z.number().int().min(0).max(2),
  functionSelectors: z.array(bytes4Schema).min(1),
});

export const protocolActionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("propose-ownership-transfer"),
    newOwner: addressSchema,
  }),
  z.object({
    kind: z.literal("transfer-ownership"),
    newOwner: addressSchema,
  }),
  z.object({
    kind: z.literal("accept-ownership"),
  }),
  z.object({
    kind: z.literal("cancel-ownership-transfer"),
  }),
  z.object({
    kind: z.literal("set-approved-owner-target"),
    target: addressSchema,
    approved: z.boolean(),
  }),
  z.object({
    kind: z.literal("propose-diamond-cut"),
    facetCuts: z.array(facetCutSchema).min(1),
    initContract: addressSchema,
    initCalldata: bytesSchema,
  }),
  z.object({
    kind: z.literal("approve-upgrade"),
    upgradeId: bytes32Schema,
  }),
  z.object({
    kind: z.literal("execute-upgrade"),
    facetCuts: z.array(facetCutSchema).min(1),
    initContract: addressSchema,
    initCalldata: bytesSchema,
    upgradeId: bytes32Schema,
  }),
  z.object({
    kind: z.literal("raw-calldata"),
    data: bytesSchema,
    label: z.string().min(1).optional(),
  }),
]);

export const consequenceInspectSchema = z.object({
  inspect: z.boolean().default(true).optional(),
  ownershipTargets: z.array(addressSchema).optional(),
  upgradeIds: z.array(bytes32Schema).optional(),
}).optional();

const ownershipInterface = new Interface([
  "function proposeOwnershipTransfer(address _newOwner)",
  "function transferOwnership(address _newOwner)",
  "function acceptOwnership()",
  "function cancelOwnershipTransfer()",
  "function setApprovedOwnerTarget(address target,bool approved)",
]);

const diamondAdminInterface = new Interface([
  "function proposeDiamondCut((address facetAddress,uint8 action,bytes4[] functionSelectors)[] facetCuts,address initContract,bytes initCalldata) returns (bytes32)",
  "function approveUpgrade(bytes32 upgradeId)",
  "function executeUpgrade((address facetAddress,uint8 action,bytes4[] functionSelectors)[] facetCuts,address initContract,bytes initCalldata,bytes32 upgradeId)",
]);

export type ProtocolAction = z.infer<typeof protocolActionSchema>;

type PrimitiveServices = {
  multisig: ReturnType<typeof createMultisigPrimitiveService>;
  ownership: ReturnType<typeof createOwnershipPrimitiveService>;
  diamondAdmin: ReturnType<typeof createDiamondAdminPrimitiveService>;
};

export function createProtocolAdminServices(context: ApiExecutionContext): PrimitiveServices {
  return {
    multisig: createMultisigPrimitiveService(context),
    ownership: createOwnershipPrimitiveService(context),
    diamondAdmin: createDiamondAdminPrimitiveService(context),
  };
}

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

export function encodeProtocolAction(action: ProtocolAction): string {
  switch (action.kind) {
    case "propose-ownership-transfer":
      return ownershipInterface.encodeFunctionData("proposeOwnershipTransfer", [action.newOwner]);
    case "transfer-ownership":
      return ownershipInterface.encodeFunctionData("transferOwnership", [action.newOwner]);
    case "accept-ownership":
      return ownershipInterface.encodeFunctionData("acceptOwnership", []);
    case "cancel-ownership-transfer":
      return ownershipInterface.encodeFunctionData("cancelOwnershipTransfer", []);
    case "set-approved-owner-target":
      return ownershipInterface.encodeFunctionData("setApprovedOwnerTarget", [action.target, action.approved]);
    case "propose-diamond-cut":
      return diamondAdminInterface.encodeFunctionData("proposeDiamondCut", [action.facetCuts, action.initContract, action.initCalldata]);
    case "approve-upgrade":
      return diamondAdminInterface.encodeFunctionData("approveUpgrade", [action.upgradeId]);
    case "execute-upgrade":
      return diamondAdminInterface.encodeFunctionData("executeUpgrade", [action.facetCuts, action.initContract, action.initCalldata, action.upgradeId]);
    case "raw-calldata":
      return action.data;
  }
}

export function decodeProtocolAction(data: string): ProtocolAction | null {
  try {
    const parsed = ownershipInterface.parseTransaction({ data });
    if (parsed?.name === "proposeOwnershipTransfer") {
      return { kind: "propose-ownership-transfer", newOwner: String(parsed.args[0]) };
    }
    if (parsed?.name === "transferOwnership") {
      return { kind: "transfer-ownership", newOwner: String(parsed.args[0]) };
    }
    if (parsed?.name === "acceptOwnership") {
      return { kind: "accept-ownership" };
    }
    if (parsed?.name === "cancelOwnershipTransfer") {
      return { kind: "cancel-ownership-transfer" };
    }
    if (parsed?.name === "setApprovedOwnerTarget") {
      return {
        kind: "set-approved-owner-target",
        target: String(parsed.args[0]),
        approved: Boolean(parsed.args[1]),
      };
    }
  } catch {}

  try {
    const parsed = diamondAdminInterface.parseTransaction({ data });
    if (parsed?.name === "proposeDiamondCut") {
      return {
        kind: "propose-diamond-cut",
        facetCuts: normalizeFacetCuts(parsed.args[0]),
        initContract: String(parsed.args[1]),
        initCalldata: String(parsed.args[2]),
      };
    }
    if (parsed?.name === "approveUpgrade") {
      return { kind: "approve-upgrade", upgradeId: String(parsed.args[0]) };
    }
    if (parsed?.name === "executeUpgrade") {
      return {
        kind: "execute-upgrade",
        facetCuts: normalizeFacetCuts(parsed.args[0]),
        initContract: String(parsed.args[1]),
        initCalldata: String(parsed.args[2]),
        upgradeId: String(parsed.args[3]),
      };
    }
  } catch {}

  return null;
}

function normalizeFacetCuts(value: unknown): Array<z.infer<typeof facetCutSchema>> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => {
    const record = asRecord(entry);
    return {
      facetAddress: String(record?.facetAddress ?? ""),
      action: Number(record?.action ?? 0),
      functionSelectors: Array.isArray(record?.functionSelectors)
        ? record.functionSelectors.map((selector) => String(selector))
        : [],
    };
  });
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

export function readTupleBody(body: unknown): unknown[] {
  if (Array.isArray(body)) {
    return body;
  }
  const record = asRecord(body);
  return Array.isArray(record?.result)
    ? record.result
    : Array.isArray(record?.body)
      ? record.body
      : [];
}

export function mapMultisigStatusLabel(value: string | null): string {
  switch (value) {
    case "0":
      return "NonExistent";
    case "1":
      return "Pending";
    case "2":
      return "ReadyForExecution";
    case "3":
      return "Executed";
    case "4":
      return "Cancelled";
    default:
      return "Unknown";
  }
}

export function readCanExecute(body: unknown) {
  const tuple = readTupleBody(body);
  return {
    canExecute: typeof tuple[0] === "boolean" ? tuple[0] : false,
    reason: typeof tuple[1] === "string" ? tuple[1] : "",
  };
}

export async function readMultisigState(
  services: PrimitiveServices,
  auth: AuthContext,
  walletAddress: string | undefined,
  operationId: string,
  actorAddress: string | undefined,
  label: string,
) {
  const [statusResult, canExecuteResult, actorApprovedResult] = await Promise.all([
    services.multisig.getOperationStatus({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    services.multisig.canExecuteOperation({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    actorAddress
      ? services.multisig.hasApprovedOperation({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [operationId, actorAddress],
        })
      : Promise.resolve({ statusCode: 200, body: null }),
  ]);

  const status = readScalarBody(statusResult.body);
  const readiness = readCanExecute(canExecuteResult.body);

  return {
    label,
    status,
    statusLabel: mapMultisigStatusLabel(status),
    canExecute: readiness.canExecute,
    readinessReason: readiness.reason,
    actorApproved: readBooleanBody(actorApprovedResult.body),
  };
}

export async function waitForOperationStatus(
  services: PrimitiveServices,
  auth: AuthContext,
  walletAddress: string | undefined,
  operationId: string,
  expected: string[],
  label: string,
) {
  const result = await waitForWorkflowReadback(
    () => services.multisig.getOperationStatus({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    (readback) => {
      const status = readScalarBody(readback.body);
      return status !== null && expected.includes(status);
    },
    label,
  );
  return readScalarBody(result.body);
}

export function extractOperationIdFromPayload(body: unknown): string | null {
  const value = readScalarBody(body);
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/u.test(value) ? value : null;
}

export function extractOperationIdFromLogs(logs: unknown[], txHash: string | null): string | null {
  if (!txHash) {
    return null;
  }
  const entry = logs.find((log) => asRecord(log)?.transactionHash === txHash);
  const record = asRecord(entry);
  const id = record?.id ?? record?.operationId;
  return typeof id === "string" && /^0x[a-fA-F0-9]{64}$/u.test(id) ? id : null;
}

export async function readOptionalEventLogs(read: () => Promise<unknown>) {
  try {
    return normalizeEventLogs(await read());
  } catch {
    return [];
  }
}

export async function readOwnershipConsequence(
  services: PrimitiveServices,
  auth: AuthContext,
  walletAddress: string | undefined,
  targets: string[],
) {
  const [ownerResult, pendingOwnerResult, policyResult, targetResults] = await Promise.all([
    services.ownership.owner({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    services.ownership.pendingOwner({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    services.ownership.isOwnershipPolicyEnforced({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    Promise.all(targets.map(async (target) => ({
      target,
      approved: readBooleanBody((await services.ownership.isOwnerTargetApproved({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [target],
      })).body),
    }))),
  ]);

  return {
    owner: readScalarBody(ownerResult.body),
    pendingOwner: readScalarBody(pendingOwnerResult.body),
    ownershipPolicyEnforced: readBooleanBody(policyResult.body),
    targetApprovals: targetResults,
  };
}

export async function readUpgradeConsequence(
  services: PrimitiveServices,
  auth: AuthContext,
  walletAddress: string | undefined,
  upgradeIds: string[],
) {
  const [status, delay, threshold, upgrades] = await Promise.all([
    services.diamondAdmin.getUpgradeControlStatus({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    services.diamondAdmin.getUpgradeDelay({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    services.diamondAdmin.getUpgradeThreshold({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    Promise.all(upgradeIds.map(async (upgradeId) => {
      try {
        const result = await services.diamondAdmin.getUpgrade({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [upgradeId],
        });
        const tuple = readTupleBody(result.body);
        return {
          upgradeId,
          proposer: typeof tuple[0] === "string" ? tuple[0] : null,
          proposedAt: readScalarBody(tuple[1]),
          approvalCount: readScalarBody(tuple[2]),
          executed: typeof tuple[3] === "boolean" ? tuple[3] : null,
        };
      } catch (error) {
        return {
          upgradeId,
          error: String((error as { message?: string })?.message ?? error),
        };
      }
    })),
  ]);

  return {
    controlStatus: asRecord(status.body) ?? status.body,
    upgradeDelay: readScalarBody(delay.body),
    upgradeThreshold: readScalarBody(threshold.body),
    upgrades,
  };
}

export function collectConsequenceTargets(
  actions: ProtocolAction[],
  inspect: z.infer<typeof consequenceInspectSchema>,
  actionResults: Array<string | null> = [],
) {
  const ownershipTargets = new Set<string>(inspect?.ownershipTargets ?? []);
  const upgradeIds = new Set<string>(inspect?.upgradeIds ?? []);

  actions.forEach((action, index) => {
    if (action.kind === "propose-ownership-transfer" || action.kind === "transfer-ownership") {
      ownershipTargets.add(action.newOwner);
    }
    if (action.kind === "set-approved-owner-target") {
      ownershipTargets.add(action.target);
    }
    if (action.kind === "approve-upgrade" || action.kind === "execute-upgrade") {
      upgradeIds.add(action.upgradeId);
    }
    if (action.kind === "propose-diamond-cut") {
      const rawResult = actionResults[index];
      if (typeof rawResult === "string" && /^0x[a-fA-F0-9]{64}$/u.test(rawResult)) {
        upgradeIds.add(rawResult);
      }
    }
  });

  return {
    ownershipTargets: [...ownershipTargets],
    upgradeIds: [...upgradeIds],
  };
}

export function extractActionResults(logs: unknown[], txHash: string | null, expectedCount: number) {
  const results = new Array<string | null>(expectedCount).fill(null);
  for (const entry of logs) {
    const record = asRecord(entry);
    if (record?.transactionHash !== txHash) {
      continue;
    }
    const actionIndex = Number(record?.actionIndex ?? -1);
    if (!Number.isInteger(actionIndex) || actionIndex < 0 || actionIndex >= results.length) {
      continue;
    }
    results[actionIndex] = typeof record?.result === "string" ? record.result : null;
  }
  return results;
}

export async function readConsequenceReport(
  services: PrimitiveServices,
  auth: AuthContext,
  walletAddress: string | undefined,
  actions: ProtocolAction[],
  inspect: z.infer<typeof consequenceInspectSchema>,
  actionResults?: Array<string | null>,
) {
  if (inspect?.inspect === false) {
    return {
      inspected: false,
      ownership: null,
      diamondAdmin: null,
      note: "consequence inspection disabled",
    };
  }

  const targets = collectConsequenceTargets(actions, inspect, actionResults);
  const [ownership, diamondAdmin] = await Promise.all([
    targets.ownershipTargets.length > 0
      ? readOwnershipConsequence(services, auth, walletAddress, targets.ownershipTargets)
      : Promise.resolve(null),
    targets.upgradeIds.length > 0
      ? readUpgradeConsequence(services, auth, walletAddress, targets.upgradeIds)
      : Promise.resolve(null),
  ]);

  return {
    inspected: true,
    ownership,
    diamondAdmin,
    note: ownership || diamondAdmin
      ? null
      : "no classified ownership or diamond-admin consequences were available from the provided action set",
  };
}

export function normalizeProtocolActionError(error: unknown, workflowName: string, phase: string) {
  const message = String((error as { message?: string })?.message ?? error);
  const lower = message.toLowerCase();
  if (
    lower.includes("notoperator") ||
    lower.includes("onlyoperator") ||
    lower.includes("ownertarget") ||
    lower.includes("unauthorized") ||
    lower.includes("notfounder") ||
    lower.includes("not permitted")
  ) {
    return new HttpError(409, `${workflowName} blocked by authority/state during ${phase}: ${message}`);
  }
  if (
    lower.includes("insufficient approvals") ||
    lower.includes("already executed") ||
    lower.includes("already approved") ||
    lower.includes("notpending") ||
    lower.includes("operation cancelled") ||
    lower.includes("operation not found") ||
    lower.includes("invalid operation type") ||
    lower.includes("invalidoperationtype") ||
    lower.includes("invalidstate") ||
    lower.includes("operationexecuted") ||
    lower.includes("operationnotfound")
  ) {
    return new HttpError(409, `${workflowName} blocked by operation state during ${phase}: ${message}`);
  }
  return error instanceof Error ? error : new Error(message);
}

export const multisigProtocolChangeTestUtils = {
  encodeProtocolAction,
  decodeProtocolAction,
  mapMultisigStatusLabel,
  readCanExecute,
  extractOperationIdFromPayload,
  extractOperationIdFromLogs,
  collectConsequenceTargets,
  extractActionResults,
};

export { asRecord, hasTransactionHash, normalizeEventLogs, readWorkflowReceipt, waitForWorkflowEventQuery, waitForWorkflowReadback };
