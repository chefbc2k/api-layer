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
});
