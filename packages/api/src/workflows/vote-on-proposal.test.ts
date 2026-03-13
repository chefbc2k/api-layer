import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGovernancePrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/governance/primitives/generated/index.js", () => ({
  createGovernancePrimitiveService: mocks.createGovernancePrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runVoteOnProposalWorkflow } from "./vote-on-proposal.js";

describe("vote on proposal workflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces proposal timing/state, confirms the vote receipt, and returns a structured result", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 44 })),
        })),
      },
    } as never;
    const governance = {
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xvote-write" },
      }),
      getReceipt: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          hasVoted: true,
          support: "1",
          reason: "because",
          votes: "10",
        },
      }),
      voteCastEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xvote-receipt" }],
      }),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvote-receipt");

    const result = await runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "55",
      support: "1",
      reason: "because",
    });

    expect(result).toEqual({
      proposalWindow: {
        proposalId: "55",
        snapshot: "120",
        deadline: "240",
        proposalState: "1",
        currentBlock: "150",
      },
      vote: {
        submission: { txHash: "0xvote-write" },
        txHash: "0xvote-receipt",
        receipt: {
          hasVoted: true,
          support: "1",
          reason: "because",
          votes: "10",
        },
        proposalStateAfterVote: "1",
        eventCount: 1,
      },
      summary: {
        proposalId: "55",
        support: "1",
        voter: "0x00000000000000000000000000000000000000aa",
        reason: "because",
      },
    });
  });

  it("retries proposal-window reads and post-vote receipt confirmation", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const previousSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
      "governance-signer": "0x59c6995e998f97a5a0044966f094538c5f1c59d6a16c7a3d57ed4ac5f5f5d7c7",
    });
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 45 })),
        })),
      },
    } as never;
    const governance = {
      proposalSnapshot: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "240" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 503, body: { error: "lag" } })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xvote-write" },
      }),
      getReceipt: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { hasVoted: false },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { hasVoted: true, support: "1", reason: "workflow vote", votes: "8" },
        }),
      voteCastEventQuery: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [] })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: [{ transactionHash: "0xvote-receipt" }],
        }),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvote-receipt");

    const result = await runVoteOnProposalWorkflow(context, { ...auth, signerId: "governance-signer" }, undefined, {
      proposalId: "56",
      support: "1",
      reason: "workflow vote",
    });

    expect(governance.proposalSnapshot).toHaveBeenCalledTimes(2);
    expect(governance.proposalDeadline).toHaveBeenCalledTimes(2);
    expect(governance.getReceipt).toHaveBeenCalledTimes(2);
    expect(governance.voteCastEventQuery).toHaveBeenCalledTimes(2);
    expect(result.summary.proposalId).toBe("56");
    process.env.API_LAYER_SIGNER_MAP_JSON = previousSignerMap;
    setTimeoutSpy.mockRestore();
  });

  it("rejects votes before the proposal snapshot block", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 100),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 44 })),
        })),
      },
    } as never;
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "57",
      support: "1",
      reason: "too early",
    })).rejects.toThrow("proposal 57 is not yet votable");
  });

  it("rejects votes when the proposal is not Active", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 44 })),
        })),
      },
    } as never;
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "58",
      support: "1",
      reason: "inactive",
    })).rejects.toThrow("proposal 58 is not Active");
  });
});
