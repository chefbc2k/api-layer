import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  runOnboardRightsHolderWorkflow: vi.fn(),
  runCommercializeVoiceAssetWorkflow: vi.fn(),
}));

vi.mock("./onboard-rights-holder.js", async () => {
  const actual = await vi.importActual<typeof import("./onboard-rights-holder.js")>("./onboard-rights-holder.js");
  return {
    ...actual,
    runOnboardRightsHolderWorkflow: mocks.runOnboardRightsHolderWorkflow,
  };
});

vi.mock("./commercialize-voice-asset.js", async () => {
  const actual = await vi.importActual<typeof import("./commercialize-voice-asset.js")>("./commercialize-voice-asset.js");
  return {
    ...actual,
    runCommercializeVoiceAssetWorkflow: mocks.runCommercializeVoiceAssetWorkflow,
  };
});

import { runRightsAwareCommercializeVoiceAssetWorkflow } from "./rights-aware-commercialize-voice-asset.js";

describe("runRightsAwareCommercializeVoiceAssetWorkflow", () => {
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
  const role = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const voiceHash = "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValue({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          authorization: { txHash: "0xauth" },
          txHash: "0xauth",
          isAuthorized: true,
        },
      ],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 1,
      },
    });
    mocks.runCommercializeVoiceAssetWorkflow.mockResolvedValue({
      packaging: {
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
      },
      listing: {
        created: {
          submission: { txHash: "0xlisting" },
          txHash: "0xlisting",
          read: { tokenId: "11", isActive: true },
          listingState: { isActive: true, datasetActive: true },
          tradeReadiness: "listed-and-tradable",
        },
        inspection: null,
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      },
      purchase: null,
      withdrawal: null,
      summary: {
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
      },
    });
  });

  it("runs rights setup plus packaging and listing only", async () => {
    const result = await runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      rightsSetup: [
        {
          role,
          account: "0x00000000000000000000000000000000000000bb",
          expiryTime: "3600",
          authorizeVoice: true,
        },
      ],
      commercialization: {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        inspectListing: false,
      },
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      role,
      account: "0x00000000000000000000000000000000000000bb",
      expiryTime: "3600",
      voiceHashes: [voiceHash],
    });
    expect(mocks.runCommercializeVoiceAssetWorkflow).toHaveBeenCalledOnce();
    expect(result.summary).toEqual({
      voiceHash,
      collaboratorCount: 1,
      voiceAuthorizationCount: 1,
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

  it("runs rights setup plus packaging, listing, and purchase", async () => {
    mocks.runCommercializeVoiceAssetWorkflow.mockResolvedValueOnce({
      packaging: {
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
      },
      listing: {
        created: {
          submission: { txHash: "0xlisting" },
          txHash: "0xlisting",
          read: { tokenId: "11", isActive: true },
          listingState: { isActive: true, datasetActive: true },
          tradeReadiness: "listed-and-tradable",
        },
        inspection: { summary: { tokenId: "11", hasListing: true, inEscrow: true } },
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      },
      purchase: {
        preflight: {
          buyer: "0x00000000000000000000000000000000000000cc",
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
        },
        settlement: {},
        summary: {
          tokenId: "11",
          buyer: "0x00000000000000000000000000000000000000cc",
          seller: "0x00000000000000000000000000000000000000aa",
          listingActiveAfter: false,
          fundingInspection: "external-usdc-precondition",
        },
      },
      withdrawal: null,
      summary: {
        seller: "0x00000000000000000000000000000000000000aa",
        tokenId: "11",
        datasetId: "11",
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        listingInspectionRequested: true,
        purchaseRequested: true,
        purchaseBuyer: "0x00000000000000000000000000000000000000cc",
        buyerFundingPrecondition: "externally-managed-usdc-precondition",
        withdrawalRequested: false,
        withdrawalPayee: null,
      },
    });

    const result = await runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      rightsSetup: [
        {
          role,
          account: "0x00000000000000000000000000000000000000bb",
          expiryTime: "3600",
          authorizeVoice: true,
        },
      ],
      commercialization: {
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
      },
    });

    expect(result.purchase?.summary.buyer).toBe("0x00000000000000000000000000000000000000cc");
    expect(result.summary.buyerFundingPrecondition).toBe("externally-managed-usdc-precondition");
  });

  it("runs rights setup plus packaging, purchase, and withdrawal", async () => {
    mocks.runCommercializeVoiceAssetWorkflow.mockResolvedValueOnce({
      packaging: {
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
      },
      listing: {
        created: {
          submission: { txHash: "0xlisting" },
          txHash: "0xlisting",
          read: { tokenId: "11", isActive: true },
          listingState: { isActive: true, datasetActive: true },
          tradeReadiness: "listed-and-tradable",
        },
        inspection: null,
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      },
      purchase: {
        preflight: {
          buyer: "0x00000000000000000000000000000000000000cc",
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
        },
        settlement: {},
        summary: {
          tokenId: "11",
          buyer: "0x00000000000000000000000000000000000000cc",
          seller: "0x00000000000000000000000000000000000000aa",
          listingActiveAfter: false,
          fundingInspection: "external-usdc-precondition",
        },
      },
      withdrawal: {
        preflight: {
          payee: "0x00000000000000000000000000000000000000aa",
          paymentToken: "0xtoken",
          paymentPaused: false,
          pendingBefore: "915000",
        },
        withdrawal: {
          submission: { txHash: "0xwithdraw" },
          txHash: "0xwithdraw",
          pendingAfter: "0",
        },
        summary: {
          payee: "0x00000000000000000000000000000000000000aa",
          clearedPending: true,
          deadline: null,
        },
      },
      summary: {
        seller: "0x00000000000000000000000000000000000000aa",
        tokenId: "11",
        datasetId: "11",
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        listingInspectionRequested: false,
        purchaseRequested: true,
        purchaseBuyer: "0x00000000000000000000000000000000000000cc",
        buyerFundingPrecondition: "externally-managed-usdc-precondition",
        withdrawalRequested: true,
        withdrawalPayee: "0x00000000000000000000000000000000000000aa",
      },
    });

    const result = await runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      rightsSetup: [
        {
          role,
          account: "0x00000000000000000000000000000000000000bb",
          expiryTime: "3600",
          authorizeVoice: true,
        },
      ],
      commercialization: {
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
      },
    });

    expect(result.withdrawal?.summary.payee).toBe("0x00000000000000000000000000000000000000aa");
    expect(result.summary.withdrawalPayee).toBe("0x00000000000000000000000000000000000000aa");
  });

  it("propagates collaborator authorization failure", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          authorization: { txHash: "0xauth" },
          txHash: "0xauth",
          isAuthorized: false,
        },
      ],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        rightsSetup: [
          {
            role,
            account: "0x00000000000000000000000000000000000000bb",
            expiryTime: "3600",
            authorizeVoice: true,
          },
        ],
        commercialization: {
          packaging: {
            title: "Pack",
            assetIds: ["1"],
            metadataURI: "ipfs://pack",
            royaltyBps: "250",
            price: "1000",
            duration: "86400",
          },
          inspectListing: false,
        },
      }),
    ).rejects.toThrow("per-voice authorization confirmation");
  });

  it("propagates the external buyer precondition branch", async () => {
    mocks.runCommercializeVoiceAssetWorkflow.mockRejectedValueOnce(
      new HttpError(409, "purchase-marketplace-asset requires buyer payment-token allowance as an external precondition"),
    );

    await expect(
      runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        rightsSetup: [],
        commercialization: {
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
        },
      }),
    ).rejects.toThrow("external precondition");
  });

  it("preserves the inactive or trading-locked branch", async () => {
    mocks.runCommercializeVoiceAssetWorkflow.mockResolvedValueOnce({
      packaging: {
        licenseTemplate: { templateId: "1", source: "existing", created: false, templateHash: "0xabc", template: {} },
        dataset: {
          submission: { txHash: "0xdataset" },
          txHash: "0xdataset",
          datasetId: "11",
          read: { active: false },
        },
        ownership: {
          owner: "0x00000000000000000000000000000000000000aa",
          approval: { submission: null, txHash: null, approvedForAll: true },
        },
      },
      listing: {
        created: {
          submission: { txHash: "0xlisting" },
          txHash: "0xlisting",
          read: { tokenId: "11", isActive: true },
          listingState: { isActive: true, datasetActive: false },
          tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
        },
        inspection: { summary: { tokenId: "11", hasListing: true, inEscrow: true } },
        tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
        isTradable: false,
      },
      purchase: null,
      withdrawal: null,
      summary: {
        seller: "0x00000000000000000000000000000000000000aa",
        tokenId: "11",
        datasetId: "11",
        tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
        isTradable: false,
        listingInspectionRequested: true,
        purchaseRequested: false,
        purchaseBuyer: null,
        buyerFundingPrecondition: null,
        withdrawalRequested: false,
        withdrawalPayee: null,
      },
    });

    const result = await runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      rightsSetup: [],
      commercialization: {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        inspectListing: true,
      },
    });

    expect(result.listing.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
    expect(result.listing.isTradable).toBe(false);
    expect(result.summary.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
  });

  it("propagates child-workflow failures", async () => {
    mocks.runCommercializeVoiceAssetWorkflow.mockRejectedValueOnce(new Error("commercialization failed"));

    await expect(
      runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        rightsSetup: [],
        commercialization: {
          packaging: {
            title: "Pack",
            assetIds: ["1"],
            metadataURI: "ipfs://pack",
            royaltyBps: "250",
            price: "1000",
            duration: "86400",
          },
          inspectListing: false,
        },
      }),
    ).rejects.toThrow("commercialization failed");
  });

  it("supports role-only collaborator setup without per-voice authorization", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 0,
        authorizedVoiceCount: 0,
      },
    });

    const result = await runRightsAwareCommercializeVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      rightsSetup: [
        {
          role,
          account: "0x00000000000000000000000000000000000000bb",
          expiryTime: "3600",
          authorizeVoice: false,
        },
      ],
      commercialization: {
        packaging: {
          title: "Pack",
          assetIds: ["1"],
          metadataURI: "ipfs://pack",
          royaltyBps: "250",
          price: "1000",
          duration: "86400",
        },
        inspectListing: false,
      },
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      role,
      account: "0x00000000000000000000000000000000000000bb",
      expiryTime: "3600",
      voiceHashes: [],
    });
    expect(result.rightsSetup.summary.voiceAuthorizationCount).toBe(0);
  });
});
