import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSubmitProposalWorkflow: vi.fn(),
  runVoteOnProposalWorkflow: vi.fn(),
}));

vi.mock("./submit-proposal.js", async () => {
  const actual = await vi.importActual<typeof import("./submit-proposal.js")>("./submit-proposal.js");
  return {
    ...actual,
    runSubmitProposalWorkflow: mocks.runSubmitProposalWorkflow,
  };
});

vi.mock("./vote-on-proposal.js", async () => {
  const actual = await vi.importActual<typeof import("./vote-on-proposal.js")>("./vote-on-proposal.js");
  return {
    ...actual,
    runVoteOnProposalWorkflow: mocks.runVoteOnProposalWorkflow,
  };
});

import { runGovernanceAdminFlowWorkflow } from "./governance-admin-flow.js";

describe("runGovernanceAdminFlowWorkflow", () => {
  const auth = {
    apiKey: "submit-key",
    label: "submit",
    roles: ["service"],
    allowGasless: false,
  };
  const voteAuth = {
    apiKey: "vote-key",
    label: "vote",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "submit-key": auth,
      "vote-key": voteAuth,
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSubmitProposalWorkflow.mockResolvedValue({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
      },
      readback: {
        snapshot: "120",
        proposalState: "1",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "150",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });
    mocks.runVoteOnProposalWorkflow.mockResolvedValue({
      proposalWindow: {
        proposalId: "77",
        snapshot: "120",
        deadline: "240",
        proposalState: "1",
        currentBlock: "150",
      },
      vote: {
        submission: { txHash: "0xvote-write" },
        txHash: "0xvote-receipt",
        receipt: { hasVoted: true, support: "1", reason: "workflow vote", votes: "5" },
        proposalStateAfterVote: "1",
        eventCount: 1,
      },
      summary: {
        proposalId: "77",
        support: "1",
        voter: "0x00000000000000000000000000000000000000bb",
        reason: "workflow vote",
      },
    });
  });

  it("runs the submit-only path", async () => {
    const result = await runGovernanceAdminFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposal: {
        description: "governance admin proof",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(mocks.runSubmitProposalWorkflow).toHaveBeenCalledWith(context, auth, "0x00000000000000000000000000000000000000aa", {
      description: "governance admin proof",
      targets: ["0x00000000000000000000000000000000000000bb"],
      values: ["0"],
      calldatas: ["0x1234"],
      proposalType: "0",
    });
    expect(mocks.runVoteOnProposalWorkflow).not.toHaveBeenCalled();
    expect(result).toEqual({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "1",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "150",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "1",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("runs the submit plus eligible vote path", async () => {
    const result = await runGovernanceAdminFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposal: {
        description: "governance admin proof",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
        reason: "ship it",
        apiKey: "vote-key",
        walletAddress: "0x00000000000000000000000000000000000000bb",
      },
    });

    expect(mocks.runVoteOnProposalWorkflow).toHaveBeenCalledWith(context, voteAuth, "0x00000000000000000000000000000000000000bb", {
      proposalId: "77",
      support: "1",
      reason: "ship it",
    });
    expect(result.vote).toEqual({
      proposalWindow: expect.any(Object),
      result: expect.any(Object),
      summary: expect.any(Object),
    });
    expect(result.summary).toMatchObject({
      proposalId: "77",
      voteRequested: true,
      voteCast: true,
      voteSupport: "1",
      voter: "0x00000000000000000000000000000000000000bb",
    });
  });

  it("defaults the vote actor and reason when no override is provided", async () => {
    const result = await runGovernanceAdminFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposal: {
        description: "default vote actor",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
      },
    });

    expect(mocks.runVoteOnProposalWorkflow).toHaveBeenCalledWith(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposalId: "77",
      support: "1",
      reason: "workflow vote",
    });
    expect(result.summary.voter).toBe("0x00000000000000000000000000000000000000bb");
  });

  it("rejects pre-snapshot votes as an explicit timing block", async () => {
    mocks.runSubmitProposalWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
      },
      readback: {
        snapshot: "120",
        proposalState: "1",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "100",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1300",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });

    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
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
    })).rejects.toThrow("governance-admin-flow vote blocked by timing");
    expect(mocks.runVoteOnProposalWorkflow).not.toHaveBeenCalled();
  });

  it("rejects non-Active proposals as an explicit state block", async () => {
    mocks.runSubmitProposalWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
      },
      readback: {
        snapshot: "120",
        proposalState: "0",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "150",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });

    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "inactive",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
      },
    })).rejects.toThrow("governance-admin-flow vote blocked by state");
    expect(mocks.runVoteOnProposalWorkflow).not.toHaveBeenCalled();
  });

  it("propagates missing proposal id fallback failures from the submit workflow", async () => {
    mocks.runSubmitProposalWorkflow.mockRejectedValueOnce(
      new Error("proposal id could not be derived from workflow response or receipt"),
    );

    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "missing id",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    })).rejects.toThrow("proposal id could not be derived from workflow response or receipt");
  });

  it("rejects malformed submit output when proposalId is missing", async () => {
    mocks.runSubmitProposalWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: null,
        eventCount: 1,
      },
      readback: {
        snapshot: "120",
        proposalState: "1",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "150",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });

    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "missing proposal id",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    })).rejects.toThrow("governance-admin-flow requires submit-proposal to return proposalId");
  });

  it("rejects malformed submit output when confirmed proposal readback is missing", async () => {
    mocks.runSubmitProposalWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
      },
      readback: {
        snapshot: undefined,
        proposalState: "1",
        deadline: "240",
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "150",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });

    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "missing readback",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    })).rejects.toThrow("governance-admin-flow requires confirmed proposal readback");
  });

  it("rejects unknown vote actor overrides", async () => {
    await expect(runGovernanceAdminFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "unknown vote actor",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
        apiKey: "missing-vote-key",
      },
    })).rejects.toThrow("governance-admin-flow received unknown vote apiKey");
  });

  it("rejects vote results that do not confirm the voter receipt", async () => {
    mocks.runVoteOnProposalWorkflow.mockResolvedValueOnce({
      proposalWindow: {
        proposalId: "77",
        snapshot: "120",
        deadline: "240",
        proposalState: "1",
        currentBlock: "150",
      },
      vote: {
        submission: { txHash: "0xvote-write" },
        txHash: "0xvote-receipt",
        receipt: { hasVoted: false },
        proposalStateAfterVote: "1",
        eventCount: 1,
      },
      summary: {
        proposalId: "77",
        support: "1",
        voter: "0x00000000000000000000000000000000000000aa",
        reason: "workflow vote",
      },
    });

    await expect(runGovernanceAdminFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposal: {
        description: "receipt mismatch",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
      },
    })).rejects.toThrow("governance-admin-flow requires confirmed vote receipt");
  });
});
