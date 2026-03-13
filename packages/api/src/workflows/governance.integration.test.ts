import { Interface } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { facetRegistry } from "../../../client/src/generated/index.js";

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

import { createWorkflowRouter } from "./index.js";

describe("governance workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured submit-proposal workflow result over the router path", async () => {
    const iface = new Interface(facetRegistry.ProposalFacet.abi);
    const event = iface.encodeEventLog(
      iface.getEvent("ProposalCreated"),
      [
        700n,
        "0x00000000000000000000000000000000000000aa",
        ["0x00000000000000000000000000000000000000bb"],
        [0n],
        ["0x1234"],
        "router governance proof",
        120n,
        240n,
        0,
      ],
    );
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposeAddressArrayUint256ArrayBytesArrayStringUint8: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xproposal-write" },
      }),
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      prState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      proposalCreatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xproposal-receipt" }],
      }),
      prCastVote: vi.fn(),
      getReceipt: vi.fn(),
      voteCastEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xproposal-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
          getBlock: (tag: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 61, logs: [{ topics: event.topics, data: event.data }] })),
          getBlockNumber: vi.fn(async () => 100),
          getBlock: vi.fn(async () => ({ timestamp: 1_000 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/submit-proposal");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        description: "router governance proof",
        targets: ["0x00000000000000000000000000000000000000bb"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
        proposalId: "700",
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
        currentBlock: "100",
        latestBlockTimestamp: "1000",
        estimatedVotingStartTimestamp: "1300",
      },
      summary: {
        proposalId: "700",
        proposalType: "0",
        targetCount: 1,
        calldataCount: 1,
      },
    });
  });

  it("returns the structured vote-on-proposal workflow result over the router path", async () => {
    mocks.createGovernancePrimitiveService.mockReturnValue({
      proposeAddressArrayUint256ArrayBytesArrayStringUint8: vi.fn(),
      proposalSnapshot: vi.fn().mockResolvedValue({ statusCode: 200, body: "120" }),
      prState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      proposalDeadline: vi.fn().mockResolvedValue({ statusCode: 200, body: "240" }),
      proposalCreatedEventQuery: vi.fn(),
      prCastVote: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xvote-write" },
      }),
      getReceipt: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { hasVoted: true, support: "1", reason: "router vote", votes: "8" },
      }),
      voteCastEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xvote-receipt" }],
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xvote-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
          getBlockNumber: () => Promise<number>;
          getBlock: (tag: string) => Promise<unknown>;
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 71, logs: [] })),
          getBlockNumber: vi.fn(async () => 150),
          getBlock: vi.fn(async () => ({ timestamp: 1_000 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/vote-on-proposal");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        proposalId: "99",
        support: "1",
        reason: "router vote",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
      proposalWindow: {
        proposalId: "99",
        snapshot: "120",
        deadline: "240",
        proposalState: "1",
        currentBlock: "150",
      },
      vote: {
        submission: { txHash: "0xvote-write" },
        txHash: "0xvote-receipt",
        receipt: { hasVoted: true, support: "1", reason: "router vote", votes: "8" },
        proposalStateAfterVote: "1",
        eventCount: 1,
      },
      summary: {
        proposalId: "99",
        support: "1",
        voter: "0x00000000000000000000000000000000000000aa",
        reason: "router vote",
      },
    });
  });

  it("rejects invalid governance workflow input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);

    const submitLayer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/submit-proposal");
    const submitHandler = submitLayer?.route?.stack?.[0]?.handle;
    expect(typeof submitHandler).toBe("function");
    const badSubmitResponse = {
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
    await submitHandler({
      body: {
        description: "bad",
        targets: ["bad"],
        values: ["0"],
        calldatas: ["0x1234"],
        proposalType: "0",
      },
      header() {
        return "test-key";
      },
    }, badSubmitResponse);
    expect(badSubmitResponse.statusCode).toBe(400);

    const voteLayer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/vote-on-proposal");
    const voteHandler = voteLayer?.route?.stack?.[0]?.handle;
    expect(typeof voteHandler).toBe("function");
    const badVoteResponse = {
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
    await voteHandler({
      body: {
        proposalId: "bad",
        support: "1",
      },
      header() {
        return "test-key";
      },
    }, badVoteResponse);
    expect(badVoteResponse.statusCode).toBe(400);
    expect(mocks.createGovernancePrimitiveService).not.toHaveBeenCalled();
  });
});
