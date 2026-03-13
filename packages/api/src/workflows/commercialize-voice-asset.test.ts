import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runCreateDatasetAndListForSaleWorkflow: vi.fn(),
  runInspectMarketplaceListingWorkflow: vi.fn(),
  runPurchaseMarketplaceAssetWorkflow: vi.fn(),
  runWithdrawMarketplacePaymentsWorkflow: vi.fn(),
}));

vi.mock("./create-dataset-and-list-for-sale.js", async () => {
  const actual = await vi.importActual<typeof import("./create-dataset-and-list-for-sale.js")>("./create-dataset-and-list-for-sale.js");
  return {
    ...actual,
    runCreateDatasetAndListForSaleWorkflow: mocks.runCreateDatasetAndListForSaleWorkflow,
  };
});

vi.mock("./inspect-marketplace-listing.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-marketplace-listing.js")>("./inspect-marketplace-listing.js");
  return {
    ...actual,
    runInspectMarketplaceListingWorkflow: mocks.runInspectMarketplaceListingWorkflow,
  };
});

vi.mock("./purchase-marketplace-asset.js", async () => {
  const actual = await vi.importActual<typeof import("./purchase-marketplace-asset.js")>("./purchase-marketplace-asset.js");
  return {
    ...actual,
    runPurchaseMarketplaceAssetWorkflow: mocks.runPurchaseMarketplaceAssetWorkflow,
  };
});

vi.mock("./withdraw-marketplace-payments.js", async () => {
  const actual = await vi.importActual<typeof import("./withdraw-marketplace-payments.js")>("./withdraw-marketplace-payments.js");
  return {
    ...actual,
    runWithdrawMarketplacePaymentsWorkflow: mocks.runWithdrawMarketplacePaymentsWorkflow,
  };
});

import { runCommercializeVoiceAssetWorkflow } from "./commercialize-voice-asset.js";

describe("runCommercializeVoiceAssetWorkflow", () => {
  const context = {
    apiKeys: {
      "seller-key": {
        apiKey: "seller-key",
        label: "seller",
        roles: ["service"],
        allowGasless: false,
      },
      "buyer-key": {
        apiKey: "buyer-key",
        label: "buyer",
        roles: ["service"],
        allowGasless: false,
      },
    },
  } as never;
  const auth = {
    apiKey: "seller-key",
    label: "seller",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runCreateDatasetAndListForSaleWorkflow.mockResolvedValue({
      licenseTemplate: { templateId: "1", source: "existing", created: false, templateHash: "0xabc", template: {} },
      dataset: {
        submission: { txHash: "0xdataset" },
        txHash: "0xdataset",
        datasetId: "11",
        read: { active: true },
      },
      ownership: {
        owner: "0x00000000000000000000000000000000000000aa",
        approval: { submission: null, txHash: null, approvedForAll: true },
      },
      listing: {
        submission: { txHash: "0xlisting" },
        txHash: "0xlisting",
        read: { tokenId: "11", isActive: true },
        listingState: { isActive: true, datasetActive: true },
        tradeReadiness: "listed-and-tradable",
      },
      summary: {
        signerAddress: "0x00000000000000000000000000000000000000aa",
        datasetId: "11",
        listingActive: true,
        datasetActive: true,
        tradeReadiness: "listed-and-tradable",
      },
    });
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValue({
      listing: { tokenId: "11", isActive: true },
      escrow: { inEscrow: true },
      ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
      summary: { tokenId: "11", hasListing: true, inEscrow: true },
    });
    mocks.runPurchaseMarketplaceAssetWorkflow.mockResolvedValue({
      preflight: {
        buyer: "0x00000000000000000000000000000000000000bb",
        buyerFunding: {
          source: "externally-managed-usdc-precondition",
          paymentToken: "0xtoken",
          allowanceRead: null,
          balanceRead: null,
        },
      },
      purchase: {
        submission: { txHash: "0xpurchase" },
        txHash: "0xpurchase",
        listingAfter: { tokenId: "11", isActive: false },
        ownerAfter: "0x00000000000000000000000000000000000000bb",
        escrowAfter: { inEscrow: false },
        eventCount: { assetPurchased: 1, paymentDistributed: 2, assetReleased: 1 },
      },
      settlement: {
        pendingBefore: { seller: "0", treasury: "0", devFund: "0", unionTreasury: "0" },
        pendingAfter: { seller: "915000", treasury: "50000", devFund: "25000", unionTreasury: "10000" },
      },
      summary: {
        tokenId: "11",
        buyer: "0x00000000000000000000000000000000000000bb",
        seller: "0x00000000000000000000000000000000000000aa",
        listingActiveAfter: false,
        fundingInspection: "external-usdc-precondition",
      },
    });
    mocks.runWithdrawMarketplacePaymentsWorkflow.mockResolvedValue({
      preflight: {
        payee: "0x00000000000000000000000000000000000000aa",
        paymentToken: "0xtoken",
        paymentPaused: false,
        pendingBefore: "915000",
      },
      withdrawal: {
        mode: "standard",
        submission: { txHash: "0xwithdraw" },
        txHash: "0xwithdraw",
        pendingAfter: "0",
        eventCount: 1,
        deadline: null,
      },
      summary: {
        payee: "0x00000000000000000000000000000000000000aa",
        clearedPending: true,
        deadline: null,
      },
    });
  });

  it("runs packaging plus listing only", async () => {
    const result = await runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      packaging: {
        title: "Pack",
        assetIds: ["1"],
        metadataURI: "ipfs://pack",
        royaltyBps: "250",
        price: "1000",
        duration: "86400",
      },
      inspectListing: false,
    });

    expect(mocks.runCreateDatasetAndListForSaleWorkflow).toHaveBeenCalledOnce();
    expect(mocks.runInspectMarketplaceListingWorkflow).not.toHaveBeenCalled();
    expect(mocks.runPurchaseMarketplaceAssetWorkflow).not.toHaveBeenCalled();
    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).not.toHaveBeenCalled();
    expect(result.summary).toEqual({
      seller: "0x00000000000000000000000000000000000000aa",
      tokenId: "11",
      datasetId: "11",
      tradeReadiness: "listed-and-tradable",
      isTradable: true,
      listingInspectionRequested: false,
      purchaseRequested: false,
      purchaseBuyer: null,
      buyerFundingPrecondition: null,
      withdrawalRequested: false,
      withdrawalPayee: null,
    });
  });

  it("runs packaging plus listing plus purchase", async () => {
    const result = await runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      packaging: {
        title: "Pack",
        assetIds: ["1"],
        metadataURI: "ipfs://pack",
        royaltyBps: "250",
        price: "1000",
        duration: "86400",
      },
      inspectListing: true,
      purchase: {
        apiKey: "buyer-key",
      },
    });

    expect(mocks.runInspectMarketplaceListingWorkflow).toHaveBeenCalledWith(context, auth, undefined, { tokenId: "11" });
    expect(mocks.runPurchaseMarketplaceAssetWorkflow).toHaveBeenCalledWith(
      context,
      context.apiKeys["buyer-key"],
      undefined,
      { tokenId: "11" },
    );
    expect(result.listing.inspection).toEqual(expect.any(Object));
    expect(result.purchase?.summary.buyer).toBe("0x00000000000000000000000000000000000000bb");
    expect(result.summary.buyerFundingPrecondition).toBe("externally-managed-usdc-precondition");
  });

  it("runs packaging plus listing plus purchase plus withdrawal", async () => {
    const result = await runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      packaging: {
        title: "Pack",
        assetIds: ["1"],
        metadataURI: "ipfs://pack",
        royaltyBps: "250",
        price: "1000",
        duration: "86400",
      },
      purchase: {
        apiKey: "buyer-key",
      },
      withdrawal: {
        apiKey: "seller-key",
      },
    });

    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).toHaveBeenCalledWith(
      context,
      context.apiKeys["seller-key"],
      undefined,
      { deadline: undefined },
    );
    expect(result.withdrawal?.summary.payee).toBe("0x00000000000000000000000000000000000000aa");
    expect(result.summary.withdrawalPayee).toBe("0x00000000000000000000000000000000000000aa");
  });

  it("preserves the inactive or trading-locked branch", async () => {
    mocks.runCreateDatasetAndListForSaleWorkflow.mockResolvedValueOnce({
      licenseTemplate: { templateId: "1", source: "existing", created: false, templateHash: "0xabc", template: {} },
      dataset: { submission: { txHash: "0xdataset" }, txHash: "0xdataset", datasetId: "11", read: { active: false } },
      ownership: { owner: "0x00000000000000000000000000000000000000aa", approval: { submission: null, txHash: null, approvedForAll: true } },
      listing: {
        submission: { txHash: "0xlisting" },
        txHash: "0xlisting",
        read: { tokenId: "11", isActive: true },
        listingState: { isActive: true, datasetActive: false },
        tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
      },
      summary: {
        signerAddress: "0x00000000000000000000000000000000000000aa",
        datasetId: "11",
        listingActive: true,
        datasetActive: false,
        tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
      },
    });

    const result = await runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      packaging: {
        title: "Pack",
        assetIds: ["1"],
        metadataURI: "ipfs://pack",
        royaltyBps: "250",
        price: "1000",
        duration: "86400",
      },
      inspectListing: true,
    });

    expect(result.listing.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
    expect(result.listing.isTradable).toBe(false);
    expect(result.summary.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
  });

  it("propagates the external buyer funding or allowance precondition branch", async () => {
    mocks.runPurchaseMarketplaceAssetWorkflow.mockRejectedValueOnce(
      new HttpError(409, "purchase-marketplace-asset requires buyer payment-token allowance as an external precondition"),
    );

    await expect(
      runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        purchase: {
          apiKey: "buyer-key",
        },
      }),
    ).rejects.toThrow("external precondition");
  });

  it("propagates child-workflow failures", async () => {
    mocks.runCreateDatasetAndListForSaleWorkflow.mockRejectedValueOnce(new Error("packaging failed"));

    await expect(
      runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        purchase: {
          apiKey: "buyer-key",
        },
      }),
    ).rejects.toThrow("packaging failed");
  });

  it("rejects unknown child api keys", async () => {
    await expect(
      runCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        purchase: {
          apiKey: "missing-key",
        },
      }),
    ).rejects.toThrow("unknown purchase apiKey");
  });
});
