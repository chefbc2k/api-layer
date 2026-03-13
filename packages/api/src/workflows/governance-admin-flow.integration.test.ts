import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("governance-admin-flow workflow route", () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured governance-admin response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "submit-key": {
          apiKey: "submit-key",
          label: "submit",
          roles: ["service"],
          allowGasless: false,
        },
        "vote-key": {
          apiKey: "vote-key",
          label: "vote",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-admin-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "router governance admin proof",
          targets: ["0x00000000000000000000000000000000000000bb"],
          values: ["0"],
          calldatas: ["0x1234"],
          proposalType: "0",
        },
        vote: {
          support: "1",
          apiKey: "vote-key",
          walletAddress: "0x00000000000000000000000000000000000000bb",
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
        proposalWindow: expect.any(Object),
        result: expect.any(Object),
        summary: expect.any(Object),
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
  });

  it("rejects invalid governance-admin input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-admin-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "invalid governance admin proof",
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
    expect(mocks.runSubmitProposalWorkflow).not.toHaveBeenCalled();
    expect(mocks.runVoteOnProposalWorkflow).not.toHaveBeenCalled();
  });
});
