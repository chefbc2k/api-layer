import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createGovernancePrimitiveService } from "../modules/governance/primitives/generated/index.js";
import {
  governanceExecutionFlowWorkflowSchema,
  runGovernanceExecutionFlowWorkflow,
} from "./governance-execution-flow.js";
import {
  asRecord,
  extractScalarResult,
  hasTransactionHash,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./rights-licensing-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

export const governanceTimelockConsequenceFlowWorkflowSchema = governanceExecutionFlowWorkflowSchema.extend({
  consequence: z.object({
    inspect: z.boolean().default(true).optional(),
    operationId: bytes32Schema.optional(),
    queue: actorOverrideSchema.optional(),
    execute: actorOverrideSchema.optional(),
  }).optional(),
});

export async function runGovernanceTimelockConsequenceFlowWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof governanceTimelockConsequenceFlowWorkflowSchema>,
) {
  const governance = await runGovernanceExecutionFlowWorkflow(context, auth, walletAddress, body);
  const proposalId = typeof governance.summary.proposalId === "string"
    ? governance.summary.proposalId
    : null;
  if (!proposalId) {
    throw new Error("governance-timelock-consequence-flow requires governance-execution-flow to return proposalId");
  }

  const governanceService = createGovernancePrimitiveService(context);
  const inspectRequested = body.consequence?.inspect !== false;
  let operationId = body.consequence?.operationId ?? null;
  let currentProposalState = governance.summary.currentProposalState;
  const minDelay = inspectRequested || body.consequence?.queue || body.consequence?.execute
    ? await readMinDelay(governanceService, auth, walletAddress)
    : null;

  let timelockInspection = inspectRequested
    ? await inspectTimelockOperation(governanceService, auth, walletAddress, operationId, minDelay, "provided")
    : null;

  let queue: {
    submission: unknown,
    txHash: string | null,
    proposalStateAfterQueue: string,
    operationId: string | null,
    eventCount: {
      proposalQueued: number,
      operationStored: number,
      operationScheduled: number,
    },
  } | null = null;

  if (body.consequence?.queue) {
    if (governance.executionReadiness.queueEligible !== true) {
      throw new HttpError(
        409,
        `governance-timelock-consequence-flow queue blocked by state: proposal ${proposalId} is not queue-eligible; proposalState=${governance.executionReadiness.proposalState ?? "unknown"}`,
      );
    }

    const queueActor = resolveActorOverride(context, auth, walletAddress, body.consequence.queue, "queue");
    const queueWrite = await governanceService.prQueue({
      auth: queueActor.auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: queueActor.walletAddress,
      wireParams: [proposalId],
    }).catch((error: unknown) => {
      throw normalizeQueueExecutionError(error, proposalId);
    });
    const queueTxHash = await waitForWorkflowWriteReceipt(context, queueWrite.body, "governanceTimelockConsequence.queue");
    const queueReceipt = queueTxHash ? await readWorkflowReceipt(context, queueTxHash, "governanceTimelockConsequence.queue") : null;

    const proposalQueuedEvents = queueReceipt
      ? await waitForWorkflowEventQuery(
          () => governanceService.proposalQueuedEventQuery({
            auth: queueActor.auth,
            fromBlock: BigInt(queueReceipt.blockNumber),
            toBlock: BigInt(queueReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, queueTxHash),
          "governanceTimelockConsequence.proposalQueued",
        )
      : [];
    const operationStoredEvents = queueReceipt
      ? await waitForWorkflowEventQuery(
          () => governanceService.operationStoredEventQuery({
            auth: queueActor.auth,
            fromBlock: BigInt(queueReceipt.blockNumber),
            toBlock: BigInt(queueReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, queueTxHash),
          "governanceTimelockConsequence.operationStored",
        )
      : [];
    const operationScheduledEvents = queueReceipt
      ? await readOptionalEventLogs(() => governanceService.operationScheduledEventQuery({
          auth: queueActor.auth,
          fromBlock: BigInt(queueReceipt.blockNumber),
          toBlock: BigInt(queueReceipt.blockNumber),
        }))
      : [];

    operationId =
      operationId
      ?? extractOperationIdFromLogs(operationStoredEvents, queueTxHash)
      ?? extractOperationIdFromLogs(operationScheduledEvents, queueTxHash);
    currentProposalState = await waitForProposalState(governanceService, queueActor.auth, queueActor.walletAddress, proposalId, "5", "governanceTimelockConsequence.proposalStateAfterQueue");
    timelockInspection = inspectRequested
      ? await inspectTimelockOperation(governanceService, queueActor.auth, queueActor.walletAddress, operationId, minDelay, operationId ? "queue-event" : "unavailable")
      : null;

    queue = {
      submission: queueWrite.body,
      txHash: queueTxHash,
      proposalStateAfterQueue: currentProposalState,
      operationId,
      eventCount: {
        proposalQueued: proposalQueuedEvents.length,
        operationStored: operationStoredEvents.length,
        operationScheduled: operationScheduledEvents.length,
      },
    };
  }

  let execute: {
    submission: unknown,
    txHash: string | null,
    proposalStateAfterExecute: string,
    operationId: string | null,
    eventCount: {
      proposalExecuted: number,
      operationExecuted: number,
    },
  } | null = null;

  if (body.consequence?.execute) {
    if (currentProposalState !== "5") {
      throw new HttpError(
        409,
        `governance-timelock-consequence-flow execute blocked by state: proposal ${proposalId} is not Queued; proposalState=${currentProposalState ?? "unknown"}`,
      );
    }
    if (timelockInspection?.inspection?.ready === false && timelockInspection.inspection.pending === true) {
      throw new HttpError(
        409,
        `governance-timelock-consequence-flow execute blocked by timelock: operation ${timelockInspection.operationId} is not ready`,
      );
    }

    const executeActor = resolveActorOverride(context, auth, walletAddress, body.consequence.execute, "execute");
    const executeWrite = await governanceService.prExecute({
      auth: executeActor.auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: executeActor.walletAddress,
      wireParams: [proposalId],
    }).catch((error: unknown) => {
      throw normalizeExecuteExecutionError(error, proposalId, operationId);
    });
    const executeTxHash = await waitForWorkflowWriteReceipt(context, executeWrite.body, "governanceTimelockConsequence.execute");
    const executeReceipt = executeTxHash ? await readWorkflowReceipt(context, executeTxHash, "governanceTimelockConsequence.execute") : null;

    const proposalExecutedEvents = executeReceipt
      ? await waitForWorkflowEventQuery(
          () => governanceService.proposalExecutedEventQuery({
            auth: executeActor.auth,
            fromBlock: BigInt(executeReceipt.blockNumber),
            toBlock: BigInt(executeReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, executeTxHash),
          "governanceTimelockConsequence.proposalExecuted",
        )
      : [];
    const operationExecutedEvents = executeReceipt
      ? await waitForWorkflowEventQuery(
          () => governanceService.operationExecutedBytes32EventQuery({
            auth: executeActor.auth,
            fromBlock: BigInt(executeReceipt.blockNumber),
            toBlock: BigInt(executeReceipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, executeTxHash),
          "governanceTimelockConsequence.operationExecuted",
        )
      : [];

    operationId = operationId ?? extractOperationIdFromLogs(operationExecutedEvents, executeTxHash);
    currentProposalState = await waitForProposalState(governanceService, executeActor.auth, executeActor.walletAddress, proposalId, "7", "governanceTimelockConsequence.proposalStateAfterExecute");
    timelockInspection = inspectRequested
      ? await inspectTimelockOperation(governanceService, executeActor.auth, executeActor.walletAddress, operationId, minDelay, operationId ? "execute-event" : "unavailable")
      : null;

    execute = {
      submission: executeWrite.body,
      txHash: executeTxHash,
      proposalStateAfterExecute: currentProposalState,
      operationId,
      eventCount: {
        proposalExecuted: proposalExecutedEvents.length,
        operationExecuted: operationExecutedEvents.length,
      },
    };
  }

  const currentBlock = await readCurrentBlock(context);
  const finalExecutionReadiness = deriveExecutionReadiness(
    currentProposalState,
    governance.proposal.readback?.deadline ?? null,
    currentBlock,
    timelockInspection?.inspection ?? null,
  );

  return {
    proposal: governance.proposal,
    votingWindow: governance.votingWindow,
    vote: governance.vote,
    executionReadiness: {
      before: governance.executionReadiness,
      after: finalExecutionReadiness,
    },
    timelock: {
      inspectRequested,
      operationId,
      minDelay,
      inspection: timelockInspection,
      queue,
      execute,
    },
    summary: {
      proposalId,
      proposalType: governance.summary.proposalType,
      voteRequested: governance.summary.voteRequested,
      voteCast: governance.summary.voteCast,
      queueRequested: Boolean(body.consequence?.queue),
      queued: Boolean(queue),
      executeRequested: Boolean(body.consequence?.execute),
      executed: Boolean(execute),
      operationId,
      currentProposalState: finalExecutionReadiness.proposalState,
      currentProposalStateLabel: finalExecutionReadiness.proposalStateLabel,
      queueEligible: finalExecutionReadiness.queueEligible,
      executeEligible: finalExecutionReadiness.executeEligible,
      nextGovernanceStep: finalExecutionReadiness.nextGovernanceStep,
      voter: governance.summary.voter,
    },
  };
}

function resolveActorOverride(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  actor: z.infer<typeof actorOverrideSchema>,
  label: string,
) {
  const childAuth = context.apiKeys[actor.apiKey];
  if (!childAuth) {
    throw new HttpError(400, `governance-timelock-consequence-flow received unknown ${label} apiKey`);
  }
  return {
    auth: childAuth,
    walletAddress: actor.walletAddress ?? walletAddress,
  };
}

async function readMinDelay(
  governanceService: ReturnType<typeof createGovernancePrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
) {
  const result = await waitForWorkflowReadback(
    () => governanceService.getMinDelay({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (response) => response.statusCode === 200 && typeof readScalarBody(response.body) === "string",
    "governanceTimelockConsequence.minDelay",
  );
  return readScalarBody(result.body);
}

async function inspectTimelockOperation(
  governanceService: ReturnType<typeof createGovernancePrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
  operationId: string | null,
  minDelay: string | null,
  source: "provided" | "queue-event" | "execute-event" | "unavailable",
) {
  if (!operationId) {
    return {
      operationId: null,
      source,
      inspection: null,
      note: "timelock operation id is not available from the mounted flow inputs or events",
      minDelay,
    };
  }

  const [operation, timestamp, pending, ready, executed] = await Promise.all([
    governanceService.getOperation({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    governanceService.getTimestamp({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    governanceService.isOperationPending({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    governanceService.isOperationReady({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
    governanceService.isOperationExecuted({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [operationId],
    }),
  ]);

  return {
    operationId,
    source,
    minDelay,
    inspection: {
      timestamp: readScalarBody(timestamp.body),
      pending: pending.body === true,
      ready: ready.body === true,
      executed: executed.body === true,
      operation: operation.statusCode === 200 ? operation.body : null,
    },
  };
}

async function waitForProposalState(
  governanceService: ReturnType<typeof createGovernancePrimitiveService>,
  auth: AuthContext,
  walletAddress: string | undefined,
  proposalId: string,
  expectedState: string,
  label: string,
) {
  const result = await waitForWorkflowReadback(
    () => governanceService.prState({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [proposalId],
    }),
    (response) => response.statusCode === 200 && String(response.body) === expectedState,
    label,
  );
  return String(result.body);
}

function extractOperationIdFromLogs(logs: unknown[], txHash: string | null) {
  if (!txHash) {
    return null;
  }
  const match = logs.find((entry) => asRecord(entry)?.transactionHash === txHash);
  const record = asRecord(match);
  const operationId = record?.id ?? record?.operationId;
  return typeof operationId === "string" && /^0x[a-fA-F0-9]{64}$/u.test(operationId) ? operationId : null;
}

async function readCurrentBlock(context: ApiExecutionContext) {
  const currentBlock = await context.providerRouter.withProvider(
    "read",
    "workflow.governanceTimelockConsequence.currentBlock",
    (provider) => provider.getBlockNumber(),
  );
  return String(currentBlock);
}

async function readOptionalEventLogs(read: () => Promise<unknown>) {
  const result = await read();
  if (Array.isArray(result)) {
    return result;
  }
  const record = asRecord(result);
  return Array.isArray(record?.body) ? record.body : [];
}

function deriveExecutionReadiness(
  proposalState: string | null,
  deadline: string | null,
  currentBlock: string | null,
  timelockInspection: {
    timestamp: string | null,
    pending: boolean,
    ready: boolean,
    executed: boolean,
    operation: unknown,
  } | null,
) {
  const stateCode = proposalState;
  const deadlineBlock = parseBigInt(deadline);
  const currentBlockNumber = parseBigInt(currentBlock);
  const votingClosed = deadlineBlock !== null && currentBlockNumber !== null
    ? currentBlockNumber > deadlineBlock
    : null;
  const proposalStateLabel = mapProposalStateLabel(stateCode);

  if (stateCode === "5" && timelockInspection) {
    if (timelockInspection.executed === true) {
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-operation-already-executed",
        nextGovernanceStep: "inspect-governor-state-refresh",
        readinessBasis: "timelock-operation-derived",
      };
    }
    if (timelockInspection.ready === true) {
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: true,
        phase: "queued-ready-to-execute",
        nextGovernanceStep: "execute-when-governance-operator-is-ready",
        readinessBasis: "timelock-operation-derived",
      };
    }
    if (timelockInspection.pending === true) {
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-waiting-for-timelock",
        nextGovernanceStep: "wait-for-timelock-delay",
        readinessBasis: "timelock-operation-derived",
      };
    }
  }

  switch (stateCode) {
    case "0":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "pending",
        nextGovernanceStep: "wait-for-voting-window",
        readinessBasis: "proposal-state-derived",
      };
    case "1":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "active",
        nextGovernanceStep: "vote-or-wait-for-close",
        readinessBasis: "proposal-state-derived",
      };
    case "2":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "canceled",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "3":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "defeated",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "4":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: true,
        executeEligible: false,
        phase: "succeeded-awaiting-queue",
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        readinessBasis: "proposal-state-derived",
      };
    case "5":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-awaiting-operation-inspection",
        nextGovernanceStep: "execution-readiness-requires-timelock-operation-inspection",
        readinessBasis: "proposal-state-derived",
      };
    case "6":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "expired",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    case "7":
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "executed",
        nextGovernanceStep: "none-terminal",
        readinessBasis: "proposal-state-derived",
      };
    default:
      return {
        proposalState: stateCode,
        proposalStateLabel,
        deadline,
        currentBlock,
        votingClosed,
        queueEligible: false,
        executeEligible: false,
        phase: "unknown",
        nextGovernanceStep: "inspect-proposal-state",
        readinessBasis: "proposal-state-derived",
      };
  }
}

function mapProposalStateLabel(value: string | null): string {
  switch (value) {
    case "0":
      return "Pending";
    case "1":
      return "Active";
    case "2":
      return "Canceled";
    case "3":
      return "Defeated";
    case "4":
      return "Succeeded";
    case "5":
      return "Queued";
    case "6":
      return "Expired";
    case "7":
      return "Executed";
    default:
      return "Unknown";
  }
}

function parseBigInt(value: unknown): bigint | null {
  return typeof value === "string" && /^\d+$/u.test(value) ? BigInt(value) : null;
}

function readScalarBody(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return extractScalarResult(value);
}

function normalizeQueueExecutionError(error: unknown, proposalId: string): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("invalid proposal state") || text.includes("invalidproposalstate")) {
    return new HttpError(409, `governance-timelock-consequence-flow queue blocked by state: proposal ${proposalId} is not in Succeeded state`, extractDiagnostics(error));
  }
  if (text.includes("alreadyqueued") || text.includes("operation already exists")) {
    return new HttpError(409, `governance-timelock-consequence-flow queue blocked by state: proposal ${proposalId} is already queued`, extractDiagnostics(error));
  }
  if (text.includes("governancepaused")) {
    return new HttpError(409, "governance-timelock-consequence-flow queue blocked because governance is paused", extractDiagnostics(error));
  }
  if (text.includes("unauthorizedgovernanceaction") || text.includes("unauthorized")) {
    return new HttpError(409, "governance-timelock-consequence-flow queue blocked by insufficient authority", extractDiagnostics(error));
  }
  return error;
}

function normalizeExecuteExecutionError(error: unknown, proposalId: string, operationId: string | null): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("invalidproposalstate") || text.includes("proposal is not queued")) {
    return new HttpError(409, `governance-timelock-consequence-flow execute blocked by state: proposal ${proposalId} is not Queued`, extractDiagnostics(error));
  }
  if (
    text.includes("timelockoperationnotready")
    || text.includes("timelocklib: operation not ready or expired")
    || text.includes("timelocknotexpired")
    || text.includes("invalidtimelockexecution")
  ) {
    return new HttpError(
      409,
      `governance-timelock-consequence-flow execute blocked by timelock: operation ${operationId ?? "unknown"} is not ready`,
      extractDiagnostics(error),
    );
  }
  if (text.includes("proposalalreadyexecuted")) {
    return new HttpError(409, `governance-timelock-consequence-flow execute blocked by state: proposal ${proposalId} is already executed`, extractDiagnostics(error));
  }
  if (text.includes("unauthorizedgovernanceaction") || text.includes("unauthorized")) {
    return new HttpError(409, "governance-timelock-consequence-flow execute blocked by insufficient authority", extractDiagnostics(error));
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

export { mapProposalStateLabel };
export const governanceTimelockConsequenceTestUtils = {
  deriveExecutionReadiness,
  normalizeQueueExecutionError,
  normalizeExecuteExecutionError,
  extractOperationIdFromLogs,
  readScalarBody,
};
