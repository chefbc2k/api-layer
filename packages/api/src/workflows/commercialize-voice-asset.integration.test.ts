import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("commercialize-voice-asset workflow route", () => {
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
      settlement: {},
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured commercialization response over the router path", async () => {
    const router = createWorkflowRouter({
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
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/commercialize-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
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
        withdrawal: {
          apiKey: "seller-key",
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
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
      packaging: expect.any(Object),
      listing: {
        created: expect.any(Object),
        inspection: expect.any(Object),
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      },
      purchase: expect.any(Object),
      withdrawal: expect.any(Object),
      summary: {
        seller: "0x00000000000000000000000000000000000000aa",
        tokenId: "11",
        datasetId: "11",
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        listingInspectionRequested: true,
        purchaseRequested: true,
        purchaseBuyer: "0x00000000000000000000000000000000000000bb",
        buyerFundingPrecondition: "externally-managed-usdc-precondition",
        withdrawalRequested: true,
        withdrawalPayee: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("rejects invalid commercialization input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/commercialize-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "bad",
          duration: "86400",
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
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
    expect(mocks.runCreateDatasetAndListForSaleWorkflow).not.toHaveBeenCalled();
    expect(mocks.runPurchaseMarketplaceAssetWorkflow).not.toHaveBeenCalled();
    expect(mocks.runWithdrawMarketplacePaymentsWorkflow).not.toHaveBeenCalled();
  });
});
