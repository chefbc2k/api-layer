import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { runPurchaseMarketplaceAssetWorkflow } from "./purchase-marketplace-asset.js";

describe("runPurchaseMarketplaceAssetWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("purchases an asset and confirms ownership, listing, escrow, settlement, and events", async () => {
    const sequence: string[] = [];
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
      getListing: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("listing-before");
          return { statusCode: 200, body: { tokenId: "11", seller: "0x00000000000000000000000000000000000000aa", price: "25000000", isActive: true } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("listing-after");
          return { statusCode: 200, body: { tokenId: "11", seller: "0x00000000000000000000000000000000000000aa", price: "25000000", isActive: false } };
        }),
      getAssetState: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("escrow-state-before");
          return { statusCode: 200, body: "1" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("escrow-state-after");
          return { statusCode: 200, body: "0" };
        }),
      getOriginalOwner: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("original-owner-before");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("original-owner-after");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        }),
      isInEscrow: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("in-escrow-before");
          return { statusCode: 200, body: true };
        })
        .mockImplementationOnce(async () => {
          sequence.push("in-escrow-after");
          return { statusCode: 200, body: false };
        }),
      getAssetRevenue: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("asset-revenue-before");
          return { statusCode: 200, body: { grossRevenue: "0" } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("asset-revenue-after");
          return { statusCode: 200, body: { grossRevenue: "25000000" } };
        }),
      getRevenueMetrics: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("revenue-metrics-before");
          return { statusCode: 200, body: { totalVolume: "100" } };
        })
        .mockImplementationOnce(async () => {
          sequence.push("revenue-metrics-after");
          return { statusCode: 200, body: { totalVolume: "25100100" } };
        }),
      getPendingPayments: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("pending-seller-before");
          return { statusCode: 200, body: "10" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-treasury-before");
          return { statusCode: 200, body: "20" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-dev-before");
          return { statusCode: 200, body: "30" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-union-before");
          return { statusCode: 200, body: "40" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-seller-after");
          return { statusCode: 200, body: "110" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-treasury-after");
          return { statusCode: 200, body: "25" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-dev-after");
          return { statusCode: 200, body: "33" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("pending-union-after");
          return { statusCode: 200, body: "42" };
        }),
      purchaseAsset: vi.fn().mockImplementation(async () => {
        sequence.push("purchase-asset");
        return { statusCode: 202, body: { txHash: "0xpurchase-write" } };
      }),
      assetPurchasedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("asset-purchased-events");
        return [{ transactionHash: "0xpurchase-receipt" }];
      }),
      paymentDistributedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("payment-distributed-events");
        return [{ transactionHash: "0xpurchase-receipt" }];
      }),
      assetReleasedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("asset-released-events");
        return [{ transactionHash: "0xpurchase-receipt" }];
      }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("owner-before");
          return { statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("owner-after");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000bb" };
        }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-purchase");
      return "0xpurchase-receipt";
    });

    const result = await runPurchaseMarketplaceAssetWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1601 })) });
        }),
      },
    } as never, auth as never, "0x00000000000000000000000000000000000000bb", {
      tokenId: "11",
    });

    expect(sequence).toEqual([
      "listing-before",
      "owner-before",
      "escrow-state-before",
      "original-owner-before",
      "in-escrow-before",
      "asset-revenue-before",
      "revenue-metrics-before",
      "pending-seller-before",
      "pending-treasury-before",
      "pending-dev-before",
      "pending-union-before",
      "purchase-asset",
      "wait-purchase",
      "receipt:workflow.purchaseMarketplaceAsset.purchase.receipt",
      "listing-after",
      "owner-after",
      "escrow-state-after",
      "original-owner-after",
      "in-escrow-after",
      "asset-revenue-after",
      "revenue-metrics-after",
      "pending-seller-after",
      "pending-treasury-after",
      "pending-dev-after",
      "pending-union-after",
      "asset-purchased-events",
      "payment-distributed-events",
      "asset-released-events",
    ]);
    expect(result).toEqual({
      preflight: {
        buyer: "0x00000000000000000000000000000000000000bb",
        buyerFunding: {
          source: "externally-managed-usdc-precondition",
          paymentToken: "0x00000000000000000000000000000000000000cc",
          allowanceRead: null,
          balanceRead: null,
        },
        marketplacePaused: false,
        paymentPaused: false,
        listing: {
          tokenId: "11",
          seller: "0x00000000000000000000000000000000000000aa",
          price: "25000000",
          isActive: true,
        },
        escrow: {
          assetState: "1",
          originalOwner: "0x00000000000000000000000000000000000000aa",
          inEscrow: true,
        },
        ownerBefore: "0x0000000000000000000000000000000000000ddd",
      },
      purchase: {
        submission: { txHash: "0xpurchase-write" },
        txHash: "0xpurchase-receipt",
        listingAfter: {
          tokenId: "11",
          seller: "0x00000000000000000000000000000000000000aa",
          price: "25000000",
          isActive: false,
        },
        ownerAfter: "0x00000000000000000000000000000000000000bb",
        escrowAfter: {
          assetState: "0",
          originalOwner: "0x00000000000000000000000000000000000000aa",
          inEscrow: false,
        },
        eventCount: {
          assetPurchased: 1,
          paymentDistributed: 1,
          assetReleased: 1,
        },
      },
      settlement: {
        payees: {
          seller: "0x00000000000000000000000000000000000000aa",
          treasury: "0x00000000000000000000000000000000000000dd",
          devFund: "0x00000000000000000000000000000000000000ee",
          unionTreasury: "0x00000000000000000000000000000000000000ff",
        },
        pendingBefore: {
          seller: "10",
          treasury: "20",
          devFund: "30",
          unionTreasury: "40",
        },
        pendingAfter: {
          seller: "110",
          treasury: "25",
          devFund: "33",
          unionTreasury: "42",
        },
        pendingDelta: {
          seller: "100",
          treasury: "5",
          devFund: "3",
          unionTreasury: "2",
        },
        assetRevenueBefore: { grossRevenue: "0" },
        assetRevenueAfter: { grossRevenue: "25000000" },
        revenueMetricsBefore: { totalVolume: "100" },
        revenueMetricsAfter: { totalVolume: "25100100" },
      },
      summary: {
        tokenId: "11",
        buyer: "0x00000000000000000000000000000000000000bb",
        seller: "0x00000000000000000000000000000000000000aa",
        listingActiveAfter: false,
        fundingInspection: "external-usdc-precondition",
      },
    });
  });

  it("fails early when marketplace payments are paused", async () => {
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getUsdcToken: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000cc" }),
      isPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
      paymentPaused: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      getTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      getDevFundAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ee" }),
      getUnionTreasuryAddress: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000ff" }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn(),
    });

    await expect(runPurchaseMarketplaceAssetWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000bb", {
      tokenId: "11",
    })).rejects.toThrow("purchase-marketplace-asset requires payments to be unpaused");
  });

  it("returns zero purchase event counts when no receipt block is available after purchase", async () => {
    const marketplace = {
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
      getAssetRevenue: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: "0" }).mockResolvedValueOnce({ statusCode: 200, body: "1" }),
      getRevenueMetrics: vi.fn().mockResolvedValueOnce({ statusCode: 200, body: { totalVolume: "1" } }).mockResolvedValueOnce({ statusCode: 200, body: { totalVolume: "2" } }),
      getPendingPayments: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "2" })
        .mockResolvedValueOnce({ statusCode: 200, body: "3" })
        .mockResolvedValueOnce({ statusCode: 200, body: "4" })
        .mockResolvedValueOnce({ statusCode: 200, body: "5" })
        .mockResolvedValueOnce({ statusCode: 200, body: "6" })
        .mockResolvedValueOnce({ statusCode: 200, body: "7" })
        .mockResolvedValueOnce({ statusCode: 200, body: "8" }),
      purchaseAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xpurchase-write" } }),
      assetPurchasedEventQuery: vi.fn(),
      paymentDistributedEventQuery: vi.fn(),
      assetReleasedEventQuery: vi.fn(),
    };
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runPurchaseMarketplaceAssetWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000bb", {
      tokenId: "11",
    });

    expect(result.purchase).toMatchObject({
      txHash: null,
      eventCount: {
        assetPurchased: 0,
        paymentDistributed: 0,
        assetReleased: 0,
      },
    });
    expect(marketplace.assetPurchasedEventQuery).not.toHaveBeenCalled();
    expect(marketplace.paymentDistributedEventQuery).not.toHaveBeenCalled();
    expect(marketplace.assetReleasedEventQuery).not.toHaveBeenCalled();
  });

  it("surfaces asset-age contract reverts as an explicit workflow state block", async () => {
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
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
    });

    await expect(runPurchaseMarketplaceAssetWorkflow({
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000bb", {
      tokenId: "11",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: "purchase-marketplace-asset blocked by asset age: token 11 is still within the contract's 1 day trading lock",
    });
  });
});
