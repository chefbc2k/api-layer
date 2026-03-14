import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import {
  actorOverrideSchema,
  asRecord,
  bytes32Schema,
  consequenceInspectSchema,
  createProtocolAdminServices,
  encodeProtocolAction,
  extractActionResults,
  extractOperationIdFromLogs,
  extractOperationIdFromPayload,
  hasTransactionHash,
  multisigProtocolChangeTestUtils,
  normalizeProtocolActionError,
  protocolActionSchema,
  readConsequenceReport,
  readMultisigState,
  readOptionalEventLogs,
  readWorkflowReceipt,
  resolveActorOverride,
  waitForOperationStatus,
  waitForWorkflowEventQuery,
} from "./multisig-protocol-change-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const protocolActionArraySchema = z.array(protocolActionSchema).min(1);

export const proposeMultisigProtocolChangeWorkflowSchema = z.object({
  operation: z.object({
    actions: protocolActionArraySchema,
    requiredApprovals: z.string().regex(/^\d+$/u),
  }),
  actor: actorOverrideSchema.optional(),
  consequence: consequenceInspectSchema,
});

export const approveMultisigProtocolChangeWorkflowSchema = z.object({
  operationId: bytes32Schema,
  actions: protocolActionArraySchema.optional(),
  actor: actorOverrideSchema.optional(),
  consequence: consequenceInspectSchema,
});

export const executeMultisigProtocolChangeWorkflowSchema = z.object({
  operationId: bytes32Schema,
  actions: protocolActionArraySchema.optional(),
  actor: actorOverrideSchema.optional(),
  consequence: consequenceInspectSchema,
});

export async function runProposeMultisigProtocolChangeWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof proposeMultisigProtocolChangeWorkflowSchema>,
) {
  const services = createProtocolAdminServices(context);
  const actor = resolveActorOverride(context, auth, walletAddress, body.actor, "propose-multisig-protocol-change", "actor");
  const encodedActions = body.operation.actions.map(encodeProtocolAction);

  const before = await readConsequenceReport(services, actor.auth, actor.walletAddress, body.operation.actions, body.consequence);
  const write = await services.multisig.proposeOperation({
    auth: actor.auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress: actor.walletAddress,
    wireParams: [encodedActions, body.operation.requiredApprovals],
  }).catch((error: unknown) => {
    throw normalizeProtocolActionError(error, "propose-multisig-protocol-change", "propose");
  });

  const txHash = await waitForWorkflowWriteReceipt(context, write.body, "proposeMultisigProtocolChange.propose");
  const receipt = txHash ? await readWorkflowReceipt(context, txHash, "proposeMultisigProtocolChange.propose") : null;
  const proposedEvents = receipt
    ? await waitForWorkflowEventQuery(
        () => services.multisig.operationProposedEventQuery({
          auth: actor.auth,
          fromBlock: BigInt(receipt.blockNumber),
          toBlock: BigInt(receipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, txHash),
        "proposeMultisigProtocolChange.operationProposed",
      )
    : [];

  const operationId = extractOperationIdFromPayload(write.body) ?? extractOperationIdFromLogs(proposedEvents, txHash);
  if (!operationId) {
    throw new Error("propose-multisig-protocol-change could not derive operationId from write result or mounted events");
  }

  const statusCode = await waitForOperationStatus(
    services,
    actor.auth,
    actor.walletAddress,
    operationId,
    ["1", "2"],
    "proposeMultisigProtocolChange.status",
  );
  const state = await readMultisigState(
    services,
    actor.auth,
    actor.walletAddress,
    operationId,
    actor.walletAddress,
    "after-propose",
  );
  const after = await readConsequenceReport(services, actor.auth, actor.walletAddress, body.operation.actions, body.consequence);

  return {
    operation: {
      proposal: {
        submission: write.body,
        txHash,
        operationId,
        requiredApprovals: body.operation.requiredApprovals,
        encodedActions,
        eventCount: proposedEvents.length,
      },
      state: {
        ...state,
        status: statusCode ?? state.status,
      },
      actions: body.operation.actions,
    },
    consequence: {
      before,
      after,
    },
    summary: {
      operationId,
      actionCount: body.operation.actions.length,
      requiredApprovals: body.operation.requiredApprovals,
      status: statusCode ?? state.status,
      statusLabel: state.statusLabel,
      canExecute: state.canExecute,
      consequenceKinds: summarizeConsequenceKinds(body.operation.actions),
    },
  };
}

export async function runApproveMultisigProtocolChangeWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof approveMultisigProtocolChangeWorkflowSchema>,
) {
  const services = createProtocolAdminServices(context);
  const actor = resolveActorOverride(context, auth, walletAddress, body.actor, "approve-multisig-protocol-change", "actor");
  const actions = body.actions ?? [];

  const beforeState = await readMultisigState(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    actor.walletAddress,
    "before-approve",
  );
  const before = await readConsequenceReport(services, actor.auth, actor.walletAddress, actions, body.consequence);

  const write = await services.multisig.approveOperation({
    auth: actor.auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress: actor.walletAddress,
    wireParams: [body.operationId],
  }).catch((error: unknown) => {
    throw normalizeProtocolActionError(error, "approve-multisig-protocol-change", "approve");
  });

  const txHash = await waitForWorkflowWriteReceipt(context, write.body, "approveMultisigProtocolChange.approve");
  const receipt = txHash ? await readWorkflowReceipt(context, txHash, "approveMultisigProtocolChange.approve") : null;
  const approvedEvents = receipt
    ? await waitForWorkflowEventQuery(
        () => services.multisig.operationApprovedEventQuery({
          auth: actor.auth,
          fromBlock: BigInt(receipt.blockNumber),
          toBlock: BigInt(receipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, txHash),
        "approveMultisigProtocolChange.operationApproved",
      )
    : [];
  const statusEvents = receipt
    ? await readOptionalEventLogs(() => services.multisig.operationStatusChangedEventQuery({
        auth: actor.auth,
        fromBlock: BigInt(receipt.blockNumber),
        toBlock: BigInt(receipt.blockNumber),
      }))
    : [];

  const statusCode = await waitForOperationStatus(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    ["1", "2"],
    "approveMultisigProtocolChange.status",
  );
  const afterState = await readMultisigState(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    actor.walletAddress,
    "after-approve",
  );
  const after = await readConsequenceReport(services, actor.auth, actor.walletAddress, actions, body.consequence);

  return {
    operation: {
      operationId: body.operationId,
      before: beforeState,
      after: {
        ...afterState,
        status: statusCode ?? afterState.status,
      },
      actions,
    },
    approval: {
      submission: write.body,
      txHash,
      approver: actor.walletAddress ?? null,
      approved: afterState.actorApproved,
      eventCount: {
        operationApproved: approvedEvents.length,
        operationStatusChanged: statusEvents.filter((entry) => asMultisigTxMatch(entry, txHash)).length,
      },
    },
    consequence: {
      before,
      after,
    },
    summary: {
      operationId: body.operationId,
      approver: actor.walletAddress ?? null,
      approved: afterState.actorApproved,
      status: statusCode ?? afterState.status,
      statusLabel: afterState.statusLabel,
      canExecute: afterState.canExecute,
      consequenceKinds: summarizeConsequenceKinds(actions),
    },
  };
}

export async function runExecuteMultisigProtocolChangeWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof executeMultisigProtocolChangeWorkflowSchema>,
) {
  const services = createProtocolAdminServices(context);
  const actor = resolveActorOverride(context, auth, walletAddress, body.actor, "execute-multisig-protocol-change", "actor");
  const actions = body.actions ?? [];

  const beforeState = await readMultisigState(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    actor.walletAddress,
    "before-execute",
  );
  const before = await readConsequenceReport(services, actor.auth, actor.walletAddress, actions, body.consequence);

  const write = await services.multisig.executeOperation({
    auth: actor.auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress: actor.walletAddress,
    wireParams: [body.operationId],
  }).catch((error: unknown) => {
    throw normalizeProtocolActionError(error, "execute-multisig-protocol-change", "execute");
  });

  const txHash = await waitForWorkflowWriteReceipt(context, write.body, "executeMultisigProtocolChange.execute");
  const receipt = txHash ? await readWorkflowReceipt(context, txHash, "executeMultisigProtocolChange.execute") : null;
  const executedEvents = receipt
    ? await waitForWorkflowEventQuery(
        () => services.multisig.operationExecutedEventQuery({
          auth: actor.auth,
          fromBlock: BigInt(receipt.blockNumber),
          toBlock: BigInt(receipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, txHash),
        "executeMultisigProtocolChange.operationExecuted",
      )
    : [];
  const actionEvents = receipt
    ? await readOptionalEventLogs(() => services.multisig.actionExecutedEventQuery({
        auth: actor.auth,
        fromBlock: BigInt(receipt.blockNumber),
        toBlock: BigInt(receipt.blockNumber),
      }))
    : [];
  const batchEvents = receipt
    ? await readOptionalEventLogs(() => services.multisig.batchCompletedEventQuery({
        auth: actor.auth,
        fromBlock: BigInt(receipt.blockNumber),
        toBlock: BigInt(receipt.blockNumber),
      }))
    : [];

  const statusCode = await waitForOperationStatus(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    ["3"],
    "executeMultisigProtocolChange.status",
  );
  const afterState = await readMultisigState(
    services,
    actor.auth,
    actor.walletAddress,
    body.operationId,
    actor.walletAddress,
    "after-execute",
  );
  const actionResults = extractActionResults(actionEvents, txHash, actions.length);
  const after = await readConsequenceReport(services, actor.auth, actor.walletAddress, actions, body.consequence, actionResults);

  const ownershipEvents = await readOwnershipEventCounts(services, actor.auth, receipt?.blockNumber, txHash);
  const diamondEvents = await readDiamondEventCounts(services, actor.auth, receipt?.blockNumber, txHash);

  return {
    operation: {
      operationId: body.operationId,
      before: beforeState,
      after: {
        ...afterState,
        status: statusCode ?? afterState.status,
      },
      actions,
      actionResults,
    },
    execution: {
      submission: write.body,
      txHash,
      executor: actor.walletAddress ?? null,
      eventCount: {
        operationExecuted: executedEvents.length,
        actionExecuted: actionEvents.filter((entry) => asMultisigTxMatch(entry, txHash)).length,
        batchCompleted: batchEvents.filter((entry) => asMultisigTxMatch(entry, txHash)).length,
      },
    },
    consequence: {
      before,
      after,
      eventCount: {
        ownership: ownershipEvents,
        diamondAdmin: diamondEvents,
      },
    },
    summary: {
      operationId: body.operationId,
      executor: actor.walletAddress ?? null,
      status: statusCode ?? afterState.status,
      statusLabel: afterState.statusLabel,
      canExecute: afterState.canExecute,
      consequenceKinds: summarizeConsequenceKinds(actions),
    },
  };
}

async function readOwnershipEventCounts(
  services: ReturnType<typeof createProtocolAdminServices>,
  auth: AuthContext,
  blockNumber: number | undefined,
  txHash: string | null,
) {
  if (!blockNumber) {
    return {
      ownershipTransferProposed: 0,
      ownershipTransferred: 0,
      ownershipTransferCancelled: 0,
      ownershipTargetApprovalSet: 0,
    };
  }
  const [proposed, transferred, cancelled, approvals] = await Promise.all([
    readOptionalEventLogs(() => services.ownership.ownershipTransferProposedEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
    readOptionalEventLogs(() => services.ownership.ownershipTransferredEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
    readOptionalEventLogs(() => services.ownership.ownershipTransferCancelledEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
    readOptionalEventLogs(() => services.ownership.ownershipTargetApprovalSetEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
  ]);
  return {
    ownershipTransferProposed: countTxMatches(proposed, txHash),
    ownershipTransferred: countTxMatches(transferred, txHash),
    ownershipTransferCancelled: countTxMatches(cancelled, txHash),
    ownershipTargetApprovalSet: countTxMatches(approvals, txHash),
  };
}

async function readDiamondEventCounts(
  services: ReturnType<typeof createProtocolAdminServices>,
  auth: AuthContext,
  blockNumber: number | undefined,
  txHash: string | null,
) {
  if (!blockNumber) {
    return {
      upgradeProposed: 0,
      upgradeApproved: 0,
      upgradeExecuted: 0,
    };
  }
  const [proposed, approved, executed] = await Promise.all([
    readOptionalEventLogs(() => services.diamondAdmin.upgradeProposedEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
    readOptionalEventLogs(() => services.diamondAdmin.upgradeApprovedEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
    readOptionalEventLogs(() => services.diamondAdmin.upgradeExecutedEventQuery({
      auth,
      fromBlock: BigInt(blockNumber),
      toBlock: BigInt(blockNumber),
    })),
  ]);
  return {
    upgradeProposed: countTxMatches(proposed, txHash),
    upgradeApproved: countTxMatches(approved, txHash),
    upgradeExecuted: countTxMatches(executed, txHash),
  };
}

function summarizeConsequenceKinds(actions: Array<z.infer<typeof protocolActionSchema>>) {
  const kinds = new Set<string>();
  for (const action of actions) {
    switch (action.kind) {
      case "propose-ownership-transfer":
      case "transfer-ownership":
      case "accept-ownership":
      case "cancel-ownership-transfer":
      case "set-approved-owner-target":
        kinds.add("ownership");
        break;
      case "propose-diamond-cut":
      case "approve-upgrade":
      case "execute-upgrade":
        kinds.add("diamond-admin");
        break;
      default:
        break;
    }
  }
  return [...kinds];
}

function countTxMatches(logs: unknown[], txHash: string | null) {
  if (!txHash) {
    return 0;
  }
  return logs.filter((entry) => asMultisigTxMatch(entry, txHash)).length;
}

function asMultisigTxMatch(entry: unknown, txHash: string | null) {
  return asRecord(entry)?.transactionHash === txHash;
}

export { multisigProtocolChangeTestUtils };
