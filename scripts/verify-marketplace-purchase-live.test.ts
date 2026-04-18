import { describe, expect, it, vi } from "vitest";

import {
  advanceLocalForkPastMarketplaceTradingLock,
  buildMarketplacePurchaseVerifyOutput,
  buildBlockedFundingOutput,
  buildBlockedPurchaseOutput,
  estimateBuyerNativeMinimum,
  selectMarketplacePurchaseTarget,
  shouldAttemptMarketplaceRefresh,
} from "./verify-marketplace-purchase-live.js";

describe("verify marketplace purchase live target selection", () => {
  it("uses the aged fixture only when setup marked it purchase-ready", () => {
    expect(selectMarketplacePurchaseTarget({
      tokenId: "11",
      voiceHash: "0xvoice",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
    }, "0xseller")).toEqual({
      source: "aged-fixture",
      tokenId: "11",
      voiceHash: "0xvoice",
      sellerAddress: "0xseller",
      listing: null,
    });
  });

  it("rejects partial, inactive, or missing setup fixtures", () => {
    expect(selectMarketplacePurchaseTarget({
      tokenId: "12",
      voiceHash: "0xyoung",
      activeListing: true,
      purchaseReadiness: "listed-not-yet-purchase-proven",
    }, "0xseller")).toBeNull();

    expect(selectMarketplacePurchaseTarget({
      tokenId: "13",
      voiceHash: "0xinactive",
      activeListing: false,
      purchaseReadiness: "purchase-ready",
    }, "0xseller")).toBeNull();

    expect(selectMarketplacePurchaseTarget({
      tokenId: null,
      voiceHash: "0xmissing",
      activeListing: true,
      purchaseReadiness: "purchase-ready",
    }, "0xseller")).toBeNull();
  });

  it("skips seller refresh when setup already proved the saved fixture is blocked and inactive", () => {
    expect(shouldAttemptMarketplaceRefresh({
      tokenId: "13",
      voiceHash: "0xinactive",
      activeListing: false,
      status: "blocked",
      purchaseReadiness: "unverified",
    })).toBe(false);

    expect(shouldAttemptMarketplaceRefresh({
      tokenId: "11",
      voiceHash: "0xvoice",
      activeListing: true,
      status: "partial",
      purchaseReadiness: "listed-not-yet-purchase-proven",
    })).toBe(true);
  });

  it("renders a structured blocked report for known gas-funding limits", () => {
    expect(buildBlockedFundingOutput({
      chainId: 84532,
      diamondAddress: "0xdiamond",
      sellerAddress: "0xseller",
      buyerAddress: "0xbuyer",
      fundingWallet: "0xfounder",
      funding: {
        ok: false,
        balance: 100n,
        minimum: 500n,
        missing: 400n,
        fundingWallet: "0xfounder",
        recipient: "0xbuyer",
      },
      target: {
        source: "aged-fixture",
        tokenId: "11",
        voiceHash: "0xvoice",
        sellerAddress: "0xseller",
        listing: null,
      },
    })).toEqual({
      target: {
        source: "aged-fixture",
        chainId: 84532,
        diamond: "0xdiamond",
        tokenId: "11",
        voiceHash: "0xvoice",
      },
      actors: {
        seller: "0xseller",
        buyer: "0xbuyer",
        fundingWallet: "0xfounder",
      },
      classification: "blocked by setup/state",
      failureKind: "environment limitation",
      notes: {
        reason: "buyer lacks enough native gas for live marketplace purchase proof and the configured funding wallet cannot top up the gap",
        requiredMinimumWei: "500",
        buyerBalanceWei: "100",
        missingWei: "400",
        fundingWallet: "0xfounder",
        recipient: "0xbuyer",
      },
    });
  });

  it("wraps marketplace purchase outputs in the shared verify-report shape", () => {
    const output = buildMarketplacePurchaseVerifyOutput({
      classification: "proven working",
      executionResult: "purchase completed",
      actors: ["seller-key", "buyer-key", "read-key"],
      details: {
        target: {
          source: "aged-fixture",
          chainId: 84532,
          diamond: "0xdiamond",
          tokenId: "11",
          voiceHash: "0xvoice",
        },
        actorWallets: {
          seller: "0xseller",
          buyer: "0xbuyer",
        },
        preState: {
          listing: {
            tokenId: "11",
            isActive: true,
          },
        },
        purchase: {
          status: 202,
          payload: {
            txHash: "0xtx",
          },
        },
        postState: {
          listing: {
            tokenId: "11",
            isActive: false,
          },
        },
        events: {
          assetPurchased: [{ transactionHash: "0xtx" }],
        },
      },
    });

    expect(output.summary).toBe("proven working");
    expect(output.totals).toEqual({
      domainCount: 1,
      routeCount: 5,
      evidenceCount: 5,
    });
    expect(output.statusCounts).toEqual({
      "proven working": 1,
      "blocked by setup/state": 0,
      "semantically clarified but not fully proven": 0,
      "deeper issue remains": 0,
    });
    expect(output.reports["marketplace-purchase"]).toMatchObject({
      classification: "proven working",
      result: "proven working",
      executionResult: "purchase completed",
      actors: ["seller-key", "buyer-key", "read-key"],
      target: {
        source: "aged-fixture",
        tokenId: "11",
      },
      actorWallets: {
        seller: "0xseller",
        buyer: "0xbuyer",
      },
    });
    expect(output.reports["marketplace-purchase"].evidence).toHaveLength(5);
  });

  it("renders a structured blocked report for known contract-state purchase failures", () => {
    expect(buildBlockedPurchaseOutput({
      chainId: 84532,
      diamondAddress: "0xdiamond",
      sellerAddress: "0xseller",
      buyerAddress: "0xbuyer",
      target: {
        source: "aged-fixture",
        tokenId: "11",
        voiceHash: "0xvoice",
        sellerAddress: "0xseller",
        listing: null,
      },
      purchaseResponse: {
        status: 409,
        payload: {
          message: "purchase-marketplace-asset blocked by setup/state: listing for token 11 has expired",
          diagnostics: {
            expiresAt: 1776286314n,
          },
        },
      },
      listingBefore: {
        tokenId: "11",
        isActive: true,
        expiresAt: 1776286314n,
      },
    })).toEqual({
      target: {
        source: "aged-fixture",
        chainId: 84532,
        diamond: "0xdiamond",
        tokenId: "11",
        voiceHash: "0xvoice",
      },
      actors: {
        seller: "0xseller",
        buyer: "0xbuyer",
      },
      preState: {
        listing: {
          tokenId: "11",
          isActive: true,
          expiresAt: "1776286314",
        },
      },
      purchase: {
        status: 409,
        payload: {
          message: "purchase-marketplace-asset blocked by setup/state: listing for token 11 has expired",
          diagnostics: {
            expiresAt: "1776286314",
          },
        },
      },
      classification: "blocked by setup/state",
      failureKind: "contract constraint",
    });
  });

  it("sizes the buyer gas floor from the estimated purchase cost", async () => {
    const provider = {
      getFeeData: async () => ({ gasPrice: 2_000_000_000n, maxFeePerGas: null }),
    };
    const marketplace = {
      purchaseAsset: {
        estimateGas: async () => 80_000n,
      },
    };

    await expect(
      estimateBuyerNativeMinimum(
        provider as never,
        marketplace as never,
        "0xbuyer",
        "11",
      ),
    ).resolves.toBe(192_000_000_000_000n);
  });

  it("falls back to the static minimum when fee data does not expose a usable gas price", async () => {
    const provider = {
      getFeeData: async () => ({ gasPrice: null, maxFeePerGas: 0n }),
    };
    const marketplace = {
      purchaseAsset: {
        estimateGas: async () => 80_000n,
      },
    };

    await expect(
      estimateBuyerNativeMinimum(
        provider as never,
        marketplace as never,
        "0xbuyer",
        "11",
      ),
    ).resolves.toBe(50_000_000_000_000n);
  });

  it("keeps the static minimum when the estimated purchase cost is smaller", async () => {
    const provider = {
      getFeeData: async () => ({ gasPrice: 1n, maxFeePerGas: null }),
    };
    const marketplace = {
      purchaseAsset: {
        estimateGas: async () => 21_000n,
      },
    };

    await expect(
      estimateBuyerNativeMinimum(
        provider as never,
        marketplace as never,
        "0xbuyer",
        "11",
      ),
    ).resolves.toBe(50_000_000_000_000n);
  });

  it("falls back to the static minimum when purchase gas estimation reverts", async () => {
    const provider = {
      getFeeData: async () => ({ gasPrice: 2_000_000_000n, maxFeePerGas: null }),
    };
    const marketplace = {
      purchaseAsset: {
        estimateGas: async () => {
          throw new Error("execution reverted");
        },
      },
    };

    await expect(
      estimateBuyerNativeMinimum(
        provider as never,
        marketplace as never,
        "0xbuyer",
        "11",
      ),
    ).resolves.toBe(50_000_000_000_000n);
  });

  it("advances a local fork past the marketplace trading lock for active fresh listings", async () => {
    const provider = {
      getBlock: async () => ({ timestamp: 1_000 }),
      send: vi.fn(async () => null),
    };

    await expect(
      advanceLocalForkPastMarketplaceTradingLock(
        provider as never,
        "http://127.0.0.1:8548",
        {
          isActive: true,
          createdAt: "1000",
          expiresAt: String(1_000 + 10 * 86_400),
        },
      ),
    ).resolves.toEqual({
      advanced: true,
      secondsAdvanced: "86401",
      readyAt: "87401",
    });

    expect(provider.send).toHaveBeenNthCalledWith(1, "evm_increaseTime", [86401]);
    expect(provider.send).toHaveBeenNthCalledWith(2, "evm_mine", []);
  });

  it("does not advance non-loopback or already-mature marketplace listings", async () => {
    const provider = {
      getBlock: async () => ({ timestamp: 90_000 }),
      send: vi.fn(async () => null),
    };

    await expect(
      advanceLocalForkPastMarketplaceTradingLock(
        provider as never,
        "https://base-sepolia.example.invalid",
        {
          isActive: true,
          createdAt: "1000",
          expiresAt: "999999",
        },
      ),
    ).resolves.toEqual({
      advanced: false,
      secondsAdvanced: "0",
      readyAt: "87401",
    });

    expect(provider.send).not.toHaveBeenCalled();

    await expect(
      advanceLocalForkPastMarketplaceTradingLock(
        provider as never,
        "http://127.0.0.1:8548",
        {
          isActive: true,
          createdAt: "1000",
          expiresAt: "999999",
        },
      ),
    ).resolves.toEqual({
      advanced: false,
      secondsAdvanced: "0",
      readyAt: "87401",
    });

    expect(provider.send).not.toHaveBeenCalled();
  });
});
