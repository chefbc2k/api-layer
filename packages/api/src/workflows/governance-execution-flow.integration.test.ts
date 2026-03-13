import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("governance-execution-flow workflow route", () => {
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
          reason: "workflow vote",
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured governance execution response over the router path", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-execution-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "router governance execution proof",
          targets: ["0x00000000000000000000000000000000000000bb"],
          values: ["0"],
          calldatas: ["0x1234"],
          proposalType: "0",
        },
        vote: {
          support: "1",
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
      vote: expect.any(Object),
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
        voteRequested: true,
        voteCast: true,
        queueEligible: true,
        executeEligible: false,
        nextGovernanceStep: "queue-when-governance-operator-is-ready",
        voter: "0x00000000000000000000000000000000000000bb",
      },
    });
  });

  it("rejects invalid governance execution input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/governance-execution-flow");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposal: {
          description: "invalid governance execution proof",
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
    expect(mocks.runGovernanceAdminFlowWorkflow).not.toHaveBeenCalled();
  });
});
