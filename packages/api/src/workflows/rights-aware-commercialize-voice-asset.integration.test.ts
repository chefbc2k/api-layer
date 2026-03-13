import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("rights-aware-commercialize-voice-asset workflow route", () => {
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
        listingInspectionRequested: true,
        purchaseRequested: true,
        purchaseBuyer: "0x00000000000000000000000000000000000000cc",
        buyerFundingPrecondition: "externally-managed-usdc-precondition",
        withdrawalRequested: true,
        withdrawalPayee: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured rights-aware commercialization response over the router path", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/rights-aware-commercialize-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: {
          voiceHash,
        },
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
            apiKey: "seller-key",
          },
          withdrawal: {
            apiKey: "seller-key",
          },
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
      rightsSetup: {
        voiceHash,
        collaborators: [
          {
            role,
            account: "0x00000000000000000000000000000000000000bb",
            expiryTime: "3600",
            authorizeVoice: true,
            result: expect.any(Object),
          },
        ],
        summary: {
          requestedCollaboratorCount: 1,
          completedCollaboratorCount: 1,
          roleGrantCount: 1,
          voiceAuthorizationCount: 1,
        },
      },
      packaging: expect.any(Object),
      listing: {
        created: expect.any(Object),
        inspection: null,
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
      },
      purchase: expect.any(Object),
      withdrawal: expect.any(Object),
      summary: {
        voiceHash,
        collaboratorCount: 1,
        voiceAuthorizationCount: 1,
        tokenId: "11",
        datasetId: "11",
        tradeReadiness: "listed-and-tradable",
        isTradable: true,
        listingInspectionRequested: true,
        purchaseRequested: true,
        purchaseBuyer: "0x00000000000000000000000000000000000000cc",
        buyerFundingPrecondition: "externally-managed-usdc-precondition",
        withdrawalRequested: true,
        withdrawalPayee: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("rejects invalid rights-aware commercialization input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/rights-aware-commercialize-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: {
          voiceHash: "bad-hash",
        },
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
    expect(mocks.runOnboardRightsHolderWorkflow).not.toHaveBeenCalled();
    expect(mocks.runCommercializeVoiceAssetWorkflow).not.toHaveBeenCalled();
  });
});
