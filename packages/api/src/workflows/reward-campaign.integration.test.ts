import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTokenomicsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/tokenomics/primitives/generated/index.js", () => ({
  createTokenomicsPrimitiveService: mocks.createTokenomicsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { createWorkflowRouter } from "./index.js";

describe("reward campaign workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured create-reward-campaign workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      campaignCount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "2" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" }),
      createCampaign: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xcreate-write", result: "3" },
      }),
      campaignCreatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcreate-receipt", campaignId: "3" }]),
      getCampaign: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
          startTime: "1000",
          cliffSeconds: "100",
          durationSeconds: "900",
          tgeUnlockBps: "500",
          maxTotalClaimable: "1000000",
          totalClaimed: "0",
          paused: false,
        },
      }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xcreate-receipt");

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
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 701 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-reward-campaign");
    const handler = layer?.route?.stack?.[0]?.handle;

    const request = {
      body: {
        merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
        startTime: "1000",
        cliffSeconds: "100",
        durationSeconds: "900",
        tgeUnlockBps: "500",
        maxTotalClaimable: "1000000",
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
    expect(response.payload).toMatchObject({
      campaign: {
        txHash: "0xcreate-receipt",
        campaignId: "3",
        eventCount: 1,
      },
      counts: {
        before: "2",
        after: "3",
      },
    });
  });

  it("returns the structured manage-reward-campaign workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", paused: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", paused: false } }),
      setMerkleRoot: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroot-write" } }),
      campaignMerkleRootUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xroot-receipt" }]),
      unpauseCampaign: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xunpause-write" } }),
      campaignUnpausedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xunpause-receipt" }]),
      pauseCampaign: vi.fn(),
      campaignPausedEventQuery: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xroot-receipt")
      .mockResolvedValueOnce("0xunpause-receipt");

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
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xroot-receipt" ? 702 : 703 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/manage-reward-campaign");
    const handler = layer?.route?.stack?.[0]?.handle;

    const request = {
      body: {
        campaignId: "4",
        newMerkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        paused: false,
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
    expect(response.payload).toMatchObject({
      merkleRootUpdate: {
        txHash: "0xroot-receipt",
        source: "updated",
      },
      pauseState: {
        txHash: "0xunpause-receipt",
        source: "unpaused",
      },
      summary: {
        campaignId: "4",
        finalPaused: false,
      },
    });
  });

  it("returns the structured claim-reward-campaign workflow result over the router path", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "5", paused: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { totalClaimed: "15", paused: false } }),
      claimableAmount: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      claimed: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0" })
        .mockResolvedValueOnce({ statusCode: 200, body: "10" }),
      claim: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xclaim-write", result: "10" } }),
      claimedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xclaim-receipt", amount: "10" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xclaim-receipt");

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
        }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 704 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/claim-reward-campaign");
    const handler = layer?.route?.stack?.[0]?.handle;

    const request = {
      body: {
        campaignId: "5",
        totalAllocation: "10",
        proof: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
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
    expect(response.payload).toMatchObject({
      claimed: {
        claimedNow: "10",
      },
      claim: {
        txHash: "0xclaim-receipt",
        eventCount: 1,
      },
      summary: {
        campaignId: "5",
        claimer: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("returns a 409 when claim-reward-campaign is blocked by missing campaign funding", async () => {
    mocks.createTokenomicsPrimitiveService.mockReturnValue({
      getCampaign: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalClaimed: "0", paused: false } }),
      claimableAmount: vi.fn().mockResolvedValue({ statusCode: 200, body: "2" }),
      claimed: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
      claim: vi.fn().mockRejectedValue({
        message: "execution reverted: InsufficientCampaignFunding(uint256,uint256)",
        diagnostics: { cause: "execution reverted: InsufficientCampaignFunding(uint256,uint256)" },
      }),
      claimedEventQuery: vi.fn(),
    });

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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/claim-reward-campaign");
    const handler = layer?.route?.stack?.[0]?.handle;

    const request = {
      body: {
        campaignId: "5",
        totalAllocation: "2",
        proof: [],
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

    expect(response.statusCode).toBe(409);
    expect(response.payload).toEqual({
      error: "claim-reward-campaign blocked by setup/state: campaign has no token funding",
      diagnostics: {
        cause: "execution reverted: InsufficientCampaignFunding(uint256,uint256)",
      },
    });
  });

  it("rejects invalid manage-reward-campaign input before invoking primitives", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/manage-reward-campaign");
    const handler = layer?.route?.stack?.[0]?.handle;

    const request = {
      body: {
        campaignId: "5",
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "test-key";
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
    expect(mocks.createTokenomicsPrimitiveService).not.toHaveBeenCalled();
  });
});
