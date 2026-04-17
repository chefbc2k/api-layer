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

import { runVoteOnProposalWorkflow, voteOnProposalTestUtils } from "./vote-on-proposal.js";

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

  it("requires signer-backed auth when no wallet address is supplied", async () => {
    const previousSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
    delete process.env.API_LAYER_SIGNER_MAP_JSON;
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
      proposalSnapshot: vi.fn(),
      proposalDeadline: vi.fn(),
      prState: vi.fn(),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });

    await expect(runVoteOnProposalWorkflow(context, auth, undefined, {
      proposalId: "59",
      support: "1",
      reason: "missing signer",
    })).rejects.toThrow("vote-on-proposal requires signer-backed auth");

    process.env.API_LAYER_SIGNER_MAP_JSON = previousSignerMap;
  });

  it("skips vote-cast event reads when the vote write never yields a confirmed tx hash", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 62 })),
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
        body: { hasVoted: true, support: "1", reason: "no tx hash", votes: "4" },
      }),
      voteCastEventQuery: vi.fn(),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "60",
      support: "1",
      reason: "no tx hash",
    });

    expect(result.vote.txHash).toBeNull();
    expect(result.vote.eventCount).toBe(0);
    expect(governance.voteCastEventQuery).not.toHaveBeenCalled();
  });

  it("returns zero vote events when the receipt lookup is unavailable", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => label === "workflow.voteOnProposal.voteReceipt" ? null : { blockNumber: 63 }),
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
        body: { hasVoted: true, support: "1", reason: "missing receipt", votes: "4" },
      }),
      voteCastEventQuery: vi.fn(),
    };
    mocks.createGovernancePrimitiveService.mockReturnValue(governance);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvote-receipt");

    const result = await runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "61",
      support: "1",
      reason: "missing receipt",
    });

    expect(result.vote.eventCount).toBe(0);
    expect(governance.voteCastEventQuery).not.toHaveBeenCalled();
  });

  it("surfaces vote receipt confirmation timeouts with the last observed body", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 64 })),
        })),
      },
    } as never;
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValue({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xvote-write" },
      }),
      getReceipt: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { hasVoted: false, support: "1" },
      }),
      voteCastEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "62",
      support: "1",
      reason: "timeout",
    })).rejects.toThrow('voteOnProposal.voteReceipt.62 readback timeout: {"hasVoted":false,"support":"1"}');

    setTimeoutSpy.mockRestore();
  });

  it("fails proposal-window lookup after exhausting retries", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
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
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 503, body: { error: "lag" } }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "63",
      support: "1",
      reason: "window failure",
    })).rejects.toThrow('proposal 63 window lookup failed: {"snapshot":{"error":"lag"},"deadline":"240","proposalState":"1"}');

    setTimeoutSpy.mockRestore();
  });

  it("surfaces thrown proposal-window lookup errors", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
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
      proposalSnapshot: vi.fn().mockRejectedValue(new Error("snapshot exploded")),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "66",
      support: "1",
      reason: "window throw",
    })).rejects.toThrow("proposal 66 window lookup failed: snapshot exploded");

    setTimeoutSpy.mockRestore();
  });

  it("surfaces vote-cast event timeouts and direct array normalization", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getBlockNumber: () => Promise<number>;
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getBlockNumber: vi.fn(async () => 150),
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 65 })),
        })),
      },
    } as never;
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValue({ statusCode: 200, body: "1" }),
      prCastVote: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xvote-write" },
      }),
      getReceipt: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { hasVoted: true, support: "1", reason: "event timeout", votes: "4" },
      }),
      voteCastEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([{ transactionHash: "0xother" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvote-receipt");

    await expect(runVoteOnProposalWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "64",
      support: "1",
      reason: "event timeout",
    })).rejects.toThrow('voteOnProposal.voteCast event query timeout: [{"transactionHash":"0xother"}]');

    expect(voteOnProposalTestUtils.normalizeEventLogs([{ transactionHash: "0xabc" }])).toEqual([{ transactionHash: "0xabc" }]);
    expect(voteOnProposalTestUtils.normalizeEventLogs({ body: { transactionHash: "0xabc" } } as never)).toEqual([]);
    setTimeoutSpy.mockRestore();
  });

  it("requires a configured signer map even when signer-backed auth is declared", async () => {
    const previousSignerMap = process.env.API_LAYER_SIGNER_MAP_JSON;
    delete process.env.API_LAYER_SIGNER_MAP_JSON;
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

    await expect(runVoteOnProposalWorkflow(context, { ...auth, signerId: "governance-signer" }, undefined, {
      proposalId: "65",
      support: "1",
      reason: "missing signer map",
    })).rejects.toThrow("vote-on-proposal requires signer-backed auth");

    process.env.API_LAYER_SIGNER_MAP_JSON = previousSignerMap;
  });
});
