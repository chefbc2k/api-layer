import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runGovernanceExecutionFlowWorkflow: vi.fn(),
  createGovernancePrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("./governance-execution-flow.js", async () => {
  const actual = await vi.importActual<typeof import("./governance-execution-flow.js")>("./governance-execution-flow.js");
  return {
    ...actual,
    runGovernanceExecutionFlowWorkflow: mocks.runGovernanceExecutionFlowWorkflow,
  };
});

vi.mock("../modules/governance/primitives/generated/index.js", () => ({
  createGovernancePrimitiveService: mocks.createGovernancePrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import {
  governanceTimelockConsequenceTestUtils,
  mapProposalStateLabel,
  runGovernanceTimelockConsequenceFlowWorkflow,
} from "./governance-timelock-consequence-flow.js";

describe("runGovernanceTimelockConsequenceFlowWorkflow", () => {
  const auth = {
    apiKey: "submit-key",
    label: "submit",
    roles: ["service"],
    allowGasless: false,
  };
  const queueAuth = {
    apiKey: "queue-key",
    label: "queue",
    roles: ["service"],
    allowGasless: false,
  };
  const executeAuth = {
    apiKey: "execute-key",
    label: "execute",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "submit-key": auth,
      "queue-key": queueAuth,
      "execute-key": executeAuth,
    },
    providerRouter: {
      withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
        getTransactionReceipt: (txHash: string) => Promise<unknown>;
        getBlockNumber: () => Promise<number>;
      }) => Promise<unknown>) => work({
        getTransactionReceipt: vi.fn(async (txHash: string) => {
          if (txHash === "0xqueue-write") {
            return { blockNumber: 401 };
          }
          if (txHash === "0xexecute-write") {
            return { blockNumber: 402 };
          }
          if (label.includes("receipt")) {
            return { blockNumber: 400 };
          }
          return null;
        }),
        getBlockNumber: vi.fn(async () => 405),
      })),
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xqueue-write");
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValue({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "4",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "250",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "4",
      },
      vote: null,
      executionReadiness: {
        proposalState: "4",
        proposalStateLabel: "Succeeded",
        deadline: "240",
        currentBlock: "250",
        votingClosed: true,
        queueEligible: true,
        executeEligible: false,
        phase: "succeeded-awaiting-queue",
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "4",
        currentProposalStateLabel: "Succeeded",
        voteRequested: false,
        voteCast: false,
        queueEligible: true,
        executeEligible: false,
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        voter: "0x00000000000000000000000000000000000000aa",
      },
    });
    mocks.createGovernancePrimitiveService.mockReturnValue({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute-write" } }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", id: "0x1111111111111111111111111111111111111111111111111111111111111111" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      proposalExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute-write", proposalId: "77" }] }),
      operationExecutedBytes32EventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute-write", id: "0x1111111111111111111111111111111111111111111111111111111111111111" }] }),
    });
  });

  it("reports consequence readiness honestly when no operation id is available", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "5",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "5",
      },
      vote: null,
      executionReadiness: {
        proposalState: "5",
        proposalStateLabel: "Queued",
        deadline: "240",
        currentBlock: "300",
        votingClosed: true,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-awaiting-execution-window",
        nextGovernanceStep: "execution-readiness-depends-on-timelock-state-not-surfaced-here",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: false,
        nextGovernanceStep: "execution-readiness-depends-on-timelock-state-not-surfaced-here",
        voter: null,
      },
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queued consequence",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.after.phase).toBe("queued-awaiting-operation-inspection");
    expect(result.executionReadiness.after.nextGovernanceStep).toBe("execution-readiness-requires-timelock-operation-inspection");
    expect(result.timelock.inspection).toEqual({
      operationId: null,
      source: "provided",
      inspection: null,
      note: "timelock operation id is not available from the mounted flow inputs or events",
      minDelay: "60",
    });
  });

  it("queues a proposal and derives pending timelock readiness from mounted events and reads", async () => {
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn(),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", id: "0x1111111111111111111111111111111111111111111111111111111111111111" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue consequence",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    });

    expect(result.timelock.queue).toEqual({
      submission: { txHash: "0xqueue-write" },
      txHash: "0xqueue-write",
      proposalStateAfterQueue: "5",
      operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      eventCount: {
        proposalQueued: 1,
        operationStored: 1,
        operationScheduled: 0,
      },
    });
    expect(result.executionReadiness.after).toEqual({
      proposalState: "5",
      proposalStateLabel: "Queued",
      deadline: "240",
      currentBlock: "405",
      votingClosed: true,
      queueEligible: false,
      executeEligible: false,
      phase: "queued-waiting-for-timelock",
      nextGovernanceStep: "wait-for-timelock-delay",
      readinessBasis: "timelock-operation-derived",
    });
    expect(result.summary.queued).toBe(true);
  });

  it("queues without receipt-backed events when inspection is disabled", async () => {
    const queueWallet = "0x00000000000000000000000000000000000000cc";
    const service = {
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn(),
      getTimestamp: vi.fn(),
      isOperationPending: vi.fn(),
      isOperationReady: vi.fn(),
      isOperationExecuted: vi.fn(),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn(),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn(),
      operationStoredEventQuery: vi.fn(),
      operationScheduledEventQuery: vi.fn(),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    };
    mocks.createGovernancePrimitiveService.mockReturnValueOnce(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue without receipt",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        inspect: false,
        queue: {
          apiKey: "queue-key",
          walletAddress: queueWallet,
        },
      },
    });

    expect(service.prQueue).toHaveBeenCalledWith(expect.objectContaining({
      auth: queueAuth,
      walletAddress: queueWallet,
    }));
    expect(result.timelock.inspectRequested).toBe(false);
    expect(result.timelock.inspection).toBeNull();
    expect(result.timelock.queue).toEqual({
      submission: { txHash: "0xqueue-write" },
      txHash: null,
      proposalStateAfterQueue: "5",
      operationId: null,
      eventCount: {
        proposalQueued: 0,
        operationStored: 0,
        operationScheduled: 0,
      },
    });
    expect(service.proposalQueuedEventQuery).not.toHaveBeenCalled();
    expect(service.operationStoredEventQuery).not.toHaveBeenCalled();
    expect(service.operationScheduledEventQuery).not.toHaveBeenCalled();
  });

  it("derives the timelock operation id from scheduled events when stored events omit it", async () => {
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn(),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", note: "missing id" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", id: "0x2222222222222222222222222222222222222222222222222222222222222222" }] }),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue from scheduled event",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    });

    expect(result.timelock.queue?.operationId).toBe("0x2222222222222222222222222222222222222222222222222222222222222222");
    expect(result.timelock.inspection?.source).toBe("queue-event");
  });

  it("accepts direct-array scheduled event reads when deriving the timelock operation id", async () => {
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn(),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", note: "missing id" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xqueue-write", operationId: "0x3333333333333333333333333333333333333333333333333333333333333333" }]),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue from direct array",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    });

    expect(result.timelock.queue?.operationId).toBe("0x3333333333333333333333333333333333333333333333333333333333333333");
  });

  it("queues and executes a proposal when the timelock becomes ready", async () => {
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xqueue-write")
      .mockResolvedValueOnce("0xexecute-write");
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { timestamp: "500", executed: true, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: false }),
      isOperationReady: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute-write" } }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValueOnce({ statusCode: 200, body: "7" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", id: "0x1111111111111111111111111111111111111111111111111111111111111111" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [] }),
      proposalExecutedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute-write", proposalId: "77" }] }),
      operationExecutedBytes32EventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute-write", id: "0x1111111111111111111111111111111111111111111111111111111111111111" }] }),
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "execute consequence",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
        execute: {
          apiKey: "execute-key",
        },
      },
    });

    expect(result.timelock.execute).toEqual({
      submission: { txHash: "0xexecute-write" },
      txHash: "0xexecute-write",
      proposalStateAfterExecute: "7",
      operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      eventCount: {
        proposalExecuted: 1,
        operationExecuted: 1,
      },
    });
    expect(result.executionReadiness.after.phase).toBe("executed");
    expect(result.summary.executed).toBe(true);
  });

  it("skips timelock inspection when explicitly disabled", async () => {
    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "inspection disabled",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        inspect: false,
      },
    });

    expect(result.timelock).toEqual({
      inspectRequested: false,
      operationId: null,
      minDelay: null,
      inspection: null,
      queue: null,
      execute: null,
    });
    expect(result.executionReadiness.after.phase).toBe("succeeded-awaiting-queue");
  });

  it("blocks queue when the proposal is not queue-eligible", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: "1", deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "180",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "1",
      },
      vote: null,
      executionReadiness: {
        proposalState: "1",
        proposalStateLabel: "Active",
        deadline: "240",
        currentBlock: "180",
        votingClosed: false,
        queueEligible: false,
        executeEligible: false,
        phase: "active",
        nextGovernanceStep: "vote-or-wait-for-close",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "1",
        currentProposalStateLabel: "Active",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: false,
        nextGovernanceStep: "vote-or-wait-for-close",
        voter: null,
      },
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "cannot queue",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    })).rejects.toThrow("queue blocked by state");
  });

  it("normalizes queue write failures through the workflow catch path", async () => {
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockRejectedValue(new Error("UnauthorizedGovernanceAction")),
      prExecute: vi.fn(),
      prState: vi.fn(),
      proposalQueuedEventQuery: vi.fn(),
      operationStoredEventQuery: vi.fn(),
      operationScheduledEventQuery: vi.fn(),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue unauthorized",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    })).rejects.toMatchObject<HttpError>({
      statusCode: 409,
      message: "governance-timelock-consequence-flow queue blocked by insufficient authority",
    });
  });

  it("blocks execute when the timelock is still pending", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: "5", deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "5",
      },
      vote: null,
      executionReadiness: {
        proposalState: "5",
        proposalStateLabel: "Queued",
        deadline: "240",
        currentBlock: "300",
        votingClosed: true,
        queueEligible: false,
        executeEligible: false,
        phase: "queued-awaiting-execution-window",
        nextGovernanceStep: "execution-readiness-depends-on-timelock-state-not-surfaced-here",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: false,
        nextGovernanceStep: "execution-readiness-depends-on-timelock-state-not-surfaced-here",
        voter: null,
      },
    });
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn(),
      prExecute: vi.fn(),
      prState: vi.fn(),
      proposalQueuedEventQuery: vi.fn(),
      operationStoredEventQuery: vi.fn(),
      operationScheduledEventQuery: vi.fn(),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "still pending",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        execute: {
          apiKey: "execute-key",
        },
      },
    })).rejects.toThrow("execute blocked by timelock");
  });

  it("blocks execute when the proposal has not been queued yet", async () => {
    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "not queued",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        execute: {
          apiKey: "execute-key",
        },
      },
    })).rejects.toMatchObject<HttpError>({
      statusCode: 409,
      message: expect.stringContaining("is not Queued"),
    });
  });

  it("normalizes execute write failures through the workflow catch path", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: "5", deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "5",
      },
      vote: null,
      executionReadiness: {
        proposalState: "5",
        proposalStateLabel: "Queued",
        deadline: "240",
        currentBlock: "300",
        votingClosed: true,
        queueEligible: false,
        executeEligible: true,
        phase: "queued-ready-to-execute",
        nextGovernanceStep: "execute-when-operator-is-ready",
        readinessBasis: "timelock-operation-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: true,
        nextGovernanceStep: "execute-when-operator-is-ready",
        voter: null,
      },
    });
    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 200, body: { timestamp: "500", executed: false, canceled: false } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn(),
      prExecute: vi.fn().mockRejectedValue(new Error("UnauthorizedGovernanceAction")),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn(),
      operationStoredEventQuery: vi.fn(),
      operationScheduledEventQuery: vi.fn(),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "execute unauthorized",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        execute: {
          apiKey: "execute-key",
        },
      },
    })).rejects.toSatisfy((error) => error instanceof HttpError
      && error.statusCode === 409
      && error.message === "governance-timelock-consequence-flow execute blocked by insufficient authority");
  });

  it("executes with a provided operation id even when no receipt-backed event evidence is available", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: "5", deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "5",
      },
      vote: null,
      executionReadiness: {
        proposalState: "5",
        proposalStateLabel: "Queued",
        deadline: "240",
        currentBlock: "300",
        votingClosed: true,
        queueEligible: false,
        executeEligible: true,
        phase: "queued-ready-to-execute",
        nextGovernanceStep: "execute-when-governance-operator-is-ready",
        readinessBasis: "timelock-operation-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: true,
        nextGovernanceStep: "execute-when-governance-operator-is-ready",
        voter: null,
      },
    });
    const service = {
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn(),
      getTimestamp: vi.fn(),
      isOperationPending: vi.fn(),
      isOperationReady: vi.fn(),
      isOperationExecuted: vi.fn(),
      prQueue: vi.fn(),
      prExecute: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute-write" } }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "7" }),
      proposalQueuedEventQuery: vi.fn(),
      operationStoredEventQuery: vi.fn(),
      operationScheduledEventQuery: vi.fn(),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    };
    mocks.createGovernancePrimitiveService.mockReturnValueOnce(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const operationId = "0x3333333333333333333333333333333333333333333333333333333333333333";
    const result = await runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "execute without receipt",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        inspect: false,
        operationId,
        execute: {
          apiKey: "execute-key",
        },
      },
    });

    expect(result.timelock.inspectRequested).toBe(false);
    expect(result.timelock.inspection).toBeNull();
    expect(result.timelock.execute).toEqual({
      submission: { txHash: "0xexecute-write" },
      txHash: null,
      proposalStateAfterExecute: "7",
      operationId,
      eventCount: {
        proposalExecuted: 0,
        operationExecuted: 0,
      },
    });
    expect(service.proposalExecutedEventQuery).not.toHaveBeenCalled();
    expect(service.operationExecutedBytes32EventQuery).not.toHaveBeenCalled();
  });

  it("propagates child governance timing failures", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockRejectedValueOnce(
      new HttpError(409, "governance-admin-flow vote blocked by timing: proposal 77 is not yet votable"),
    );

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "too early",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
      },
    })).rejects.toThrow("vote blocked by timing");
  });

  it("rejects malformed child output and unknown queue actors explicitly", async () => {
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "4",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "250",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "4",
      },
      vote: null,
      executionReadiness: {
        proposalState: "4",
        proposalStateLabel: "Succeeded",
        deadline: "240",
        currentBlock: "250",
        votingClosed: true,
        queueEligible: true,
        executeEligible: false,
        phase: "succeeded-awaiting-queue",
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: null,
        proposalType: "0",
        currentProposalState: "4",
        currentProposalStateLabel: "Succeeded",
        voteRequested: false,
        voteCast: false,
        queueEligible: true,
        executeEligible: false,
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        voter: null,
      },
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "bad child",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    })).rejects.toThrow("requires governance-execution-flow to return proposalId");

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "bad actor",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "missing-key",
        },
      },
    })).rejects.toThrow("unknown queue apiKey");

    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: "5", deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "5",
      },
      vote: null,
      executionReadiness: {
        proposalState: "5",
        proposalStateLabel: "Queued",
        deadline: "240",
        currentBlock: "300",
        votingClosed: true,
        queueEligible: false,
        executeEligible: true,
        phase: "queued-ready-to-execute",
        nextGovernanceStep: "execute-when-governance-operator-is-ready",
        readinessBasis: "timelock-operation-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: true,
        nextGovernanceStep: "execute-when-governance-operator-is-ready",
        voter: null,
      },
    });

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "bad execute actor",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        execute: {
          apiKey: "missing-key",
        },
      },
    })).rejects.toThrow("unknown execute apiKey");
  });

  it("surfaces unknown proposal-state labels in queue and execute state blocks", async () => {
    const unknownStateGovernance = {
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: { snapshot: "120", proposalState: null, deadline: "240" },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "200",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: null,
      },
      vote: null,
      executionReadiness: {
        proposalState: null,
        proposalStateLabel: "Unknown",
        deadline: "240",
        currentBlock: "200",
        votingClosed: false,
        queueEligible: false,
        executeEligible: false,
        phase: "unknown",
        nextGovernanceStep: "inspect-proposal-state",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: null,
        currentProposalStateLabel: "Unknown",
        voteRequested: false,
        voteCast: false,
        queueEligible: false,
        executeEligible: false,
        nextGovernanceStep: "inspect-proposal-state",
        voter: null,
      },
    };
    mocks.runGovernanceExecutionFlowWorkflow
      .mockResolvedValueOnce(unknownStateGovernance)
      .mockResolvedValueOnce(unknownStateGovernance);

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queue blocked by unknown state",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    })).rejects.toThrow("proposalState=unknown");

    await expect(runGovernanceTimelockConsequenceFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "execute blocked by unknown state",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        execute: {
          apiKey: "execute-key",
        },
      },
    })).rejects.toThrow("proposalState=unknown");
  });
});

describe("governance timelock consequence helpers", () => {
  it("maps proposal labels and scalar extraction helpers", () => {
    expect(mapProposalStateLabel("0")).toBe("Pending");
    expect(mapProposalStateLabel("1")).toBe("Active");
    expect(mapProposalStateLabel("2")).toBe("Canceled");
    expect(mapProposalStateLabel("3")).toBe("Defeated");
    expect(mapProposalStateLabel("4")).toBe("Succeeded");
    expect(mapProposalStateLabel("5")).toBe("Queued");
    expect(mapProposalStateLabel("6")).toBe("Expired");
    expect(mapProposalStateLabel("7")).toBe("Executed");
    expect(mapProposalStateLabel("99")).toBe("Unknown");

    expect(governanceTimelockConsequenceTestUtils.readScalarBody("7")).toBe("7");
    expect(governanceTimelockConsequenceTestUtils.readScalarBody(8)).toBe("8");
    expect(governanceTimelockConsequenceTestUtils.readScalarBody(9n)).toBe("9");
    expect(governanceTimelockConsequenceTestUtils.readScalarBody({ result: "10" })).toBe("10");
    expect(governanceTimelockConsequenceTestUtils.readScalarBody({ result: 11n })).toBe("11");
    expect(governanceTimelockConsequenceTestUtils.readScalarBody(false)).toBeNull();

    expect(governanceTimelockConsequenceTestUtils.extractOperationIdFromLogs([
      { transactionHash: "0xabc", operationId: "0x1111111111111111111111111111111111111111111111111111111111111111" },
    ], "0xabc")).toBe("0x1111111111111111111111111111111111111111111111111111111111111111");
    expect(governanceTimelockConsequenceTestUtils.extractOperationIdFromLogs([], "0xabc")).toBeNull();
    expect(governanceTimelockConsequenceTestUtils.extractOperationIdFromLogs([], null)).toBeNull();
  });

  it("derives readiness across terminal and queued timelock states", () => {
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("0", "240", "100", null).phase).toBe("pending");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("1", "240", "150", null).phase).toBe("active");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("2", "240", "300", null).phase).toBe("canceled");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("3", "240", "300", null).phase).toBe("defeated");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("4", "240", "300", null).phase).toBe("succeeded-awaiting-queue");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("6", "240", "400", null).phase).toBe("expired");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("7", "240", "400", null).phase).toBe("executed");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("99", "240", "400", null).phase).toBe("unknown");

    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("5", "240", "300", {
      timestamp: "500",
      pending: false,
      ready: true,
      executed: false,
      operation: {},
    })).toMatchObject({
      phase: "queued-ready-to-execute",
      executeEligible: true,
      readinessBasis: "timelock-operation-derived",
    });
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("5", "240", "300", {
      timestamp: "500",
      pending: false,
      ready: false,
      executed: true,
      operation: {},
    }).phase).toBe("queued-operation-already-executed");
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("5", "240", "300", {
      timestamp: "500",
      pending: true,
      ready: false,
      executed: false,
      operation: {},
    })).toMatchObject({
      phase: "queued-waiting-for-timelock",
      nextGovernanceStep: "wait-for-timelock-delay",
      readinessBasis: "timelock-operation-derived",
    });
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("5", "240", "300", {
      timestamp: "500",
      pending: false,
      ready: false,
      executed: false,
      operation: {},
    })).toMatchObject({
      phase: "queued-awaiting-operation-inspection",
      executeEligible: false,
      readinessBasis: "proposal-state-derived",
    });
    expect(governanceTimelockConsequenceTestUtils.deriveExecutionReadiness("4", "not-a-block", null, null)).toMatchObject({
      phase: "succeeded-awaiting-queue",
      votingClosed: null,
    });
  });

  it("normalizes queue and execute errors into explicit state blocks", () => {
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError(
      new Error("Invalid proposal state"),
      "77",
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError(
      new Error("TimelockLib: operation already exists"),
      "77",
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError(
      new Error("GovernancePaused"),
      "77",
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError(
      new Error("UnauthorizedGovernanceAction"),
      "77",
    )).toBeInstanceOf(HttpError);

    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(
      new Error("InvalidProposalState"),
      "77",
      null,
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(
      new Error("TimelockLib: operation not ready or expired"),
      "77",
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(
      new Error("InvalidTimelockExecution"),
      "77",
      null,
    )).toMatchObject<HttpError>({
      statusCode: 409,
      message: "governance-timelock-consequence-flow execute blocked by timelock: operation unknown is not ready",
    });
    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(
      new Error("ProposalAlreadyExecuted"),
      "77",
      null,
    )).toBeInstanceOf(HttpError);
    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(
      new Error("UnauthorizedGovernanceAction"),
      "77",
      null,
    )).toBeInstanceOf(HttpError);
    const passthrough = new Error("unclassified");
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError(passthrough, "77")).toBe(passthrough);
    expect(governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError(passthrough, "77", null)).toBe(passthrough);
  });

  it("collects nested diagnostics when normalizing governance errors", () => {
    const queueError = governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError({
      message: { detail: "GovernancePaused" },
      diagnostics: { nested: { reason: "Unauthorized" } },
    }, "77");
    expect(queueError).toBeInstanceOf(HttpError);

    const executeError = governanceTimelockConsequenceTestUtils.normalizeExecuteExecutionError({
      message: { detail: "InvalidTimelockExecution" },
      diagnostics: { nested: { operation: "0x1111111111111111111111111111111111111111111111111111111111111111" } },
    }, "77", "0x1111111111111111111111111111111111111111111111111111111111111111");
    expect(executeError).toBeInstanceOf(HttpError);
  });

  it("normalizes raw scalar queue errors and tolerates malformed optional event payloads", async () => {
    expect(governanceTimelockConsequenceTestUtils.normalizeQueueExecutionError("GovernancePaused", "77")).toBeInstanceOf(HttpError);

    const workflowAuth = {
      apiKey: "submit-key",
      label: "submit",
      roles: ["service"],
      allowGasless: false,
    };
    const workflowQueueAuth = {
      apiKey: "queue-key",
      label: "queue",
      roles: ["service"],
      allowGasless: false,
    };
    const workflowContext = {
      apiKeys: {
        "submit-key": workflowAuth,
        "queue-key": workflowQueueAuth,
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => {
            if (txHash === "0xqueue-write" || label.includes("receipt")) {
              return { blockNumber: 401 };
            }
            return null;
          }),
          getBlockNumber: vi.fn(async () => 405),
        })),
      },
    } as never;

    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xqueue-write");
    mocks.runGovernanceExecutionFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "4",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "250",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "4",
      },
      vote: null,
      executionReadiness: {
        proposalState: "4",
        proposalStateLabel: "Succeeded",
        deadline: "240",
        currentBlock: "250",
        votingClosed: true,
        queueEligible: true,
        executeEligible: false,
        phase: "succeeded-awaiting-queue",
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        readinessBasis: "proposal-state-derived",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        currentProposalState: "4",
        currentProposalStateLabel: "Succeeded",
        voteRequested: false,
        voteCast: false,
        queueEligible: true,
        executeEligible: false,
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        voter: "0x00000000000000000000000000000000000000aa",
      },
    });

    mocks.createGovernancePrimitiveService.mockReturnValueOnce({
      getMinDelay: vi.fn().mockResolvedValue({ statusCode: 200, body: "60" }),
      getOperation: vi.fn().mockResolvedValue({ statusCode: 503, body: { ignored: true } }),
      getTimestamp: vi.fn().mockResolvedValue({ statusCode: 200, body: "500" }),
      isOperationPending: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationReady: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      isOperationExecuted: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      prQueue: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xqueue-write" } }),
      prExecute: vi.fn(),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "5" }),
      proposalQueuedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", proposalId: "77" }] }),
      operationStoredEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xqueue-write", id: "not-a-bytes32" }] }),
      operationScheduledEventQuery: vi.fn().mockResolvedValue({ statusCode: 200 }),
      proposalExecutedEventQuery: vi.fn(),
      operationExecutedBytes32EventQuery: vi.fn(),
    });

    const result = await runGovernanceTimelockConsequenceFlowWorkflow(workflowContext, workflowAuth, undefined, {
      proposal: {
        description: "queue malformed optional events",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      consequence: {
        queue: {
          apiKey: "queue-key",
        },
      },
    });

    expect(result.timelock.queue?.eventCount).toEqual({
      proposalQueued: 1,
      operationStored: 1,
      operationScheduled: 0,
    });
    expect(result.timelock.inspection).toEqual({
      operationId: null,
      source: "unavailable",
      inspection: null,
      note: "timelock operation id is not available from the mounted flow inputs or events",
      minDelay: "60",
    });
  });
});
