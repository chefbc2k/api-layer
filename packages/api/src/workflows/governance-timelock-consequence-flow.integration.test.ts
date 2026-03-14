import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("governance-timelock-consequence-flow workflow route", () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured governance timelock consequence response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "submit-key": {
          apiKey: "submit-key",
          label: "submit",
          roles: ["service"],
          allowGasless: false,
        },
        "queue-key": {
          apiKey: "queue-key",
          label: "queue",
          roles: ["service"],
          allowGasless: false,
        },
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 501 })),
          getBlockNumber: vi.fn(async () => 505),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-timelock-consequence-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "router governance timelock proof",
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
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "submit-key";
        }
        if (name.toLowerCase() === "x-wallet-address") {
          return "0x00000000000000000000000000000000000000aa";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual({
      proposal: expect.any(Object),
      votingWindow: expect.any(Object),
      vote: null,
      executionReadiness: {
        before: expect.any(Object),
        after: {
          proposalState: "5",
          proposalStateLabel: "Queued",
          deadline: "240",
          currentBlock: "505",
          votingClosed: true,
          queueEligible: false,
          executeEligible: false,
          phase: "queued-waiting-for-timelock",
          nextGovernanceStep: "wait-for-timelock-delay",
          readinessBasis: "timelock-operation-derived",
        },
      },
      timelock: {
        inspectRequested: true,
        operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        minDelay: "60",
        inspection: expect.any(Object),
        queue: expect.any(Object),
        execute: null,
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        queueRequested: true,
        queued: true,
        executeRequested: false,
        executed: false,
        operationId: "0x1111111111111111111111111111111111111111111111111111111111111111",
        currentProposalState: "5",
        currentProposalStateLabel: "Queued",
        queueEligible: false,
        executeEligible: false,
        nextGovernanceStep: "wait-for-timelock-delay",
        voter: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("rejects invalid governance timelock consequence input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "submit-key": {
          apiKey: "submit-key",
          label: "submit",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-timelock-consequence-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "invalid governance timelock proof",
          targets: ["bad-address"],
          values: ["0"],
          calldatas: ["0x1234"],
          proposalType: "0",
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "submit-key";
        }
        return undefined;
      },
    };
    const response = {
      statusCode: 200,
      payload: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.payload = payload;
        return this;
      },
    };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid"),
    });
    expect(mocks.runGovernanceExecutionFlowWorkflow).not.toHaveBeenCalled();
  });
});
