import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runGovernanceAdminFlowWorkflow: vi.fn(),
}));

vi.mock("./governance-admin-flow.js", async () => {
  const actual = await vi.importActual<typeof import("./governance-admin-flow.js")>("./governance-admin-flow.js");
  return {
    ...actual,
    runGovernanceAdminFlowWorkflow: mocks.runGovernanceAdminFlowWorkflow,
  };
});

import { runGovernanceExecutionFlowWorkflow } from "./governance-execution-flow.js";

describe("runGovernanceExecutionFlowWorkflow", () => {
  const auth = {
    apiKey: "submit-key",
    label: "submit",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    apiKeys: {
      "submit-key": auth,
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValue({
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

  it("runs the submit-only path", async () => {
    const result = await runGovernanceExecutionFlowWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      proposal: {
        description: "submit only",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(mocks.runGovernanceAdminFlowWorkflow).toHaveBeenCalledOnce();
    expect(result.executionReadiness).toEqual({
      proposalState: "1",
      proposalStateLabel: "Active",
      deadline: "240",
      currentBlock: "150",
      votingClosed: false,
      queueEligible: false,
      executeEligible: false,
      phase: "active",
      nextGovernanceStep: "vote-or-wait-for-close",
      readinessBasis: "proposal-state-derived",
    });
    expect(result.summary).toMatchObject({
      proposalId: "77",
      voteRequested: false,
      voteCast: false,
      queueEligible: false,
      executeEligible: false,
      nextGovernanceStep: "vote-or-wait-for-close",
    });
  });

  it("runs the submit plus vote path", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
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
      vote: {
        proposalWindow: {
          proposalId: "77",
          snapshot: "120",
          deadline: "240",
          proposalState: "1",
          currentBlock: "150",
        },
        result: {
          submission: { txHash: "0xvote-write" },
          txHash: "0xvote-receipt",
          receipt: { hasVoted: true, support: "1" },
          proposalStateAfterVote: "4",
          eventCount: 1,
        },
        summary: {
          proposalId: "77",
          support: "1",
          voter: "0x00000000000000000000000000000000000000bb",
          reason: "ship it",
        },
      },
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: true,
        voteCast: true,
        voteSupport: "1",
        voter: "0x00000000000000000000000000000000000000bb",
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "submit and vote",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      vote: {
        support: "1",
      },
    });

    expect(result.executionReadiness.phase).toBe("succeeded-awaiting-queue");
    expect(result.executionReadiness.queueEligible).toBe(true);
    expect(result.summary.voteCast).toBe(true);
  });

  it("propagates explicit pre-snapshot rejections", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockRejectedValueOnce(
      new HttpError(409, "governance-admin-flow vote blocked by timing: proposal 77 is not yet votable"),
    );

    await expect(
      runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
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
      }),
    ).rejects.toThrow("vote blocked by timing");
  });

  it("propagates explicit non-Active rejections", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockRejectedValueOnce(
      new HttpError(409, "governance-admin-flow vote blocked by state: proposal 77 is not Active"),
    );

    await expect(
      runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
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
      }),
    ).rejects.toThrow("vote blocked by state");
  });

  it("reports unresolved execution readiness honestly for queued proposals", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
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
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "queued",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness).toEqual({
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
    });
  });

  it("reports pending execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "0",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "100",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1300",
        proposalState: "0",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "pending",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("pending");
    expect(result.executionReadiness.nextGovernanceStep).toBe("wait-for-voting-window");
  });

  it("reports canceled execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "2",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "2",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "canceled",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("canceled");
    expect(result.executionReadiness.nextGovernanceStep).toBe("none-terminal");
  });

  it("reports defeated execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "3",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "300",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "3",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "defeated",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("defeated");
    expect(result.executionReadiness.nextGovernanceStep).toBe("none-terminal");
  });

  it("reports expired execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "6",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "400",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "6",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "expired",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("expired");
    expect(result.executionReadiness.nextGovernanceStep).toBe("none-terminal");
  });

  it("reports executed execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "7",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "400",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "7",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "executed",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("executed");
    expect(result.executionReadiness.nextGovernanceStep).toBe("none-terminal");
  });

  it("reports unknown execution readiness explicitly", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
      proposal: {
        submission: { txHash: "0xproposal-write" },
        txHash: "0xproposal-receipt",
        proposalId: "77",
        eventCount: 1,
        readback: {
          snapshot: "120",
          proposalState: "99",
          deadline: "240",
        },
      },
      votingWindow: {
        earliestVotingBlock: "120",
        proposalDeadlineBlock: "240",
        currentBlock: "400",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1000",
        proposalState: "99",
      },
      vote: null,
      summary: {
        proposalId: "77",
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "unknown",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.phase).toBe("unknown");
    expect(result.executionReadiness.proposalStateLabel).toBe("Unknown");
    expect(result.executionReadiness.nextGovernanceStep).toBe("inspect-proposal-state");
  });

  it("rejects malformed child output when proposal id is missing", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockResolvedValueOnce({
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
        proposalId: null,
        proposalType: "0",
        voteRequested: false,
        voteCast: false,
        voteSupport: null,
        voter: null,
      },
    });

    await expect(
      runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
        proposal: {
          description: "missing id",
          targets: ["0x00000000000000000000000000000000000000bb"],
          values: ["0"],
          calldatas: ["0x1234"],
          proposalType: "0",
        },
      }),
    ).rejects.toThrow("return proposalId");
  });

  it("falls back to the voting window state when no vote result exists", async () => {
    const result = await runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
      proposal: {
        description: "window state",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
    });

    expect(result.executionReadiness.proposalState).toBe("1");
    expect(result.executionReadiness.proposalStateLabel).toBe("Active");
  });

  it("propagates child-workflow failures", async () => {
    mocks.runGovernanceAdminFlowWorkflow.mockRejectedValueOnce(new Error("governance child failed"));

    await expect(
      runGovernanceExecutionFlowWorkflow(context, auth, undefined, {
        proposal: {
          description: "child failure",
          targets: ["0x00000000000000000000000000000000000000bb"],
          values: ["0"],
          calldatas: ["0x1234"],
          proposalType: "0",
        },
      }),
    ).rejects.toThrow("governance child failed");
  });
});
