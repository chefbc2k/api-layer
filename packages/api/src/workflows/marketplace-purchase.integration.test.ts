import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createMarketplacePrimitiveService: vi.fn(),
  createVoiceAssetsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { createWorkflowRouter } from "./index.js";

describe("marketplace purchase workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured purchase-marketplace-asset workflow result over the router path", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", seller: "0x00000000000000000000000000000000000000aa", price: "25000000", isActive: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", seller: "0x00000000000000000000000000000000000000aa", price: "25000000", isActive: false } }),
      getAssetState: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: "1" }).mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }).mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: true }).mockResolvedValueOnce({ statusCode: 200, body: false }),
      getAssetRevenue: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: { grossRevenue: "0" } }).mockResolvedValueOnce({ statusCode: 200, body: { grossRevenue: "25000000" } }),
      getRevenueMetrics: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: { totalVolume: "1" } }).mockResolvedValueOnce({ statusCode: 200, body: { totalVolume: "2" } }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10" })
        .mockResolvedValueOnce({ statusCode: 200, body: "20" })
        .mockResolvedValueOnce({ statusCode: 200, body: "30" })
        .mockResolvedValueOnce({ statusCode: 200, body: "40" })
        .mockResolvedValueOnce({ statusCode: 200, body: "110" })
        .mockResolvedValueOnce({ statusCode: 200, body: "25" })
        .mockResolvedValueOnce({ statusCode: 200, body: "33" })
        .mockResolvedValueOnce({ statusCode: 200, body: "42" }),
      purchaseAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpurchase-write" } }),
      assetPurchasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xpurchase-receipt" }]),
      paymentDistributedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xpurchase-receipt" }]),
      assetReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xpurchase-receipt" }]),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
      withdrawPayments: vi.fn(),
      withdrawPaymentsWithDeadline: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xpurchase-receipt");

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1801 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/purchase-marketplace-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { tokenId: "11" },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") return "test-key";
        if (name.toLowerCase() === "x-wallet-address") return "0x00000000000000000000000000000000000000bb";
        return undefined;
      },
    };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      purchase: {
        txHash: "0xpurchase-receipt",
        eventCount: {
          assetPurchased: 1,
          paymentDistributed: 1,
          assetReleased: 1,
        },
      },
      summary: {
        tokenId: "11",
        buyer: "0x00000000000000000000000000000000000000bb",
      },
    });
  });

  it("returns the structured withdraw-marketplace-payments workflow result over the router path", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "125" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      withdrawPaymentsWithDeadline: vi.fn(),
      withdrawPayments: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xwithdraw-write" } }),
      usdcpaymentWithdrawnEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xwithdraw-receipt" }]),
      getListing: vi.fn(),
      getAssetState: vi.fn(),
      getOriginalOwner: vi.fn(),
      isInEscrow: vi.fn(),
      getAssetRevenue: vi.fn(),
      getRevenueMetrics: vi.fn(),
      purchaseAsset: vi.fn(),
      assetPurchasedEventQuery: vi.fn(),
      paymentDistributedEventQuery: vi.fn(),
      assetReleasedEventQuery: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xwithdraw-receipt");

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1802 })),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/withdraw-marketplace-payments");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: {},
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") return "test-key";
        if (name.toLowerCase() === "x-wallet-address") return "0x00000000000000000000000000000000000000aa";
        return undefined;
      },
    };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };

    await handler(request, response);

    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      withdrawal: {
        txHash: "0xwithdraw-receipt",
        eventCount: 1,
        mode: "standard",
      },
      summary: {
        payee: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("rejects invalid purchase-marketplace-asset input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/purchase-marketplace-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = { body: { tokenId: "bad" }, header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; } };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
    expect(mocks.createMarketplacePrimitiveService).not.toHaveBeenCalled();
  });

  it("rejects invalid withdraw-marketplace-payments input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/withdraw-marketplace-payments");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = { body: { deadline: "bad" }, header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; } };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };

    await handler(request, response);

    expect(response.statusCode).toBe(400);
  });

  it("returns a state-blocked response when purchase simulation reports AssetTooNew", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "11", seller: "0x00000000000000000000000000000000000000aa", price: "25000000", isActive: true } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getAssetRevenue: vi.fn().mockResolvedValue({ statusCode: 200, body: { grossRevenue: "0" } }),
      getRevenueMetrics: vi.fn().mockResolvedValue({ statusCode: 200, body: { totalVolume: "100" } }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "10" })
        .mockResolvedValueOnce({ statusCode: 200, body: "20" })
        .mockResolvedValueOnce({ statusCode: 200, body: "30" })
        .mockResolvedValueOnce({ statusCode: 200, body: "40" }),
      purchaseAsset: vi.fn().mockRejectedValue({
        message: "execution reverted",
        diagnostics: {
          simulation: {
            topLevelCall: {
              error: "execution reverted: 0x0d9482a2000000000000000000000000000000000000000000000000000000000000000b",
            },
          },
        },
      }),
      assetPurchasedEventQuery: vi.fn(),
      paymentDistributedEventQuery: vi.fn(),
      assetReleasedEventQuery: vi.fn(),
      usdcpaymentWithdrawnEventQuery: vi.fn(),
      withdrawPayments: vi.fn(),
      withdrawPaymentsWithDeadline: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
    });

    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: { withProvider: vi.fn() },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/purchase-marketplace-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { tokenId: "11" },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") return "test-key";
        if (name.toLowerCase() === "x-wallet-address") return "0x00000000000000000000000000000000000000bb";
        return undefined;
      },
    };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };

    await handler(request, response);

    expect(response.statusCode).toBe(409);
    expect(response.payload).toMatchObject({
      error: "purchase-marketplace-asset blocked by asset age: token 11 is still within the contract's 1 day trading lock",
    });
  });
});
