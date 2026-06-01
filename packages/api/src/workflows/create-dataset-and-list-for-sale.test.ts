import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDatasetsPrimitiveService: vi.fn(),
  createMarketplacePrimitiveService: vi.fn(),
  createVoiceAssetsPrimitiveService: vi.fn(),
  resolveDatasetLicenseTemplate: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/datasets/primitives/generated/index.js", () => ({
  createDatasetsPrimitiveService: mocks.createDatasetsPrimitiveService,
}));

vi.mock("../modules/marketplace/primitives/generated/index.js", () => ({
  createMarketplacePrimitiveService: mocks.createMarketplacePrimitiveService,
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

vi.mock("./license-template.js", () => ({
  resolveDatasetLicenseTemplate: mocks.resolveDatasetLicenseTemplate,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runCreateDatasetAndListForSaleWorkflow } from "./create-dataset-and-list-for-sale.js";

describe("runCreateDatasetAndListForSaleWorkflow", () => {
  const signerPrivateKey = "0x59c6995e998f97a5a0044966f0945382db2b4e06d2c8a4f5f6f4d1f4d5c3b2a1";
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.API_LAYER_SIGNER_MAP_JSON;
  });

  it("returns a structured monetization result when dataset creation, approval, and listing all succeed", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    const sequence: string[] = [];
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}5`,
      templateId: "5",
      created: false,
      source: "existing-active",
      template: { isActive: true, name: "Creator Template" },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockImplementationOnce(async () => ({ statusCode: 200, body: ["10", "11"] }))
        .mockImplementationOnce(async () => ({ statusCode: 200, body: ["10", "11", "12"] })),
      createDataset: vi.fn().mockImplementation(async () => {
        sequence.push("create-dataset");
        return { statusCode: 202, body: { txHash: "0xdataset-write" } };
      }),
      getDataset: vi.fn().mockImplementation(async () => {
        sequence.push("read-dataset");
        return {
          statusCode: 200,
          body: { datasetId: "12", active: true, metadataURI: "ipfs://dataset" },
        };
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockImplementation(async () => {
        sequence.push("read-owner");
        return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
      }),
      isApprovedForAll: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("read-approval-1");
          return { statusCode: 200, body: false };
        })
        .mockImplementationOnce(async () => {
          sequence.push("read-approval-2");
          return { statusCode: 200, body: true };
        }),
      setApprovalForAll: vi.fn().mockImplementation(async () => {
        sequence.push("set-approval");
        return { statusCode: 202, body: { txHash: "0xapproval-write" } };
      }),
    };
    const marketplace = {
      listAsset: vi.fn().mockImplementation(async () => {
        sequence.push("list-asset");
        return { statusCode: 202, body: { txHash: "0xlisting-write" } };
      }),
      getListing: vi.fn().mockImplementation(async () => {
        sequence.push("read-listing");
        return {
          statusCode: 200,
          body: { tokenId: "12", isActive: true, price: "1000" },
        };
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-dataset");
        return "0xdataset-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-approval");
        return "0xapproval-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-listing");
        return "0xlisting-receipt";
      });

    const result = await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1", "2"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    });

    expect(sequence).toEqual([
      "read-owner",
      "read-owner",
      "create-dataset",
      "wait-dataset",
      "read-dataset",
      "read-owner",
      "read-approval-1",
      "set-approval",
      "wait-approval",
      "read-approval-2",
      "list-asset",
      "wait-listing",
      "read-listing",
    ]);
    expect(result).toEqual({
      licenseTemplate: {
        source: "existing-active",
        templateId: "5",
        templateHash: `0x${"0".repeat(63)}5`,
        created: false,
        template: { isActive: true, name: "Creator Template" },
      },
      dataset: {
        submission: { txHash: "0xdataset-write" },
        txHash: "0xdataset-receipt",
        datasetId: "12",
        read: { datasetId: "12", active: true, metadataURI: "ipfs://dataset" },
      },
      ownership: {
        owner: "0x00000000000000000000000000000000000000aa",
        approval: {
          submission: { txHash: "0xapproval-write" },
          txHash: "0xapproval-receipt",
          approvedForAll: true,
        },
      },
      listing: {
        submission: { txHash: "0xlisting-write" },
        txHash: "0xlisting-receipt",
        read: { tokenId: "12", isActive: true, price: "1000" },
        listingState: {
          isActive: true,
          datasetActive: true,
        },
        tradeReadiness: "listed-and-tradable",
      },
      summary: {
        signerAddress: "0x00000000000000000000000000000000000000aa",
        datasetId: "12",
        listingActive: true,
        datasetActive: true,
        tradeReadiness: "listed-and-tradable",
      },
    });
  });

  it("keeps approval write null when approval already exists and marks inactive datasets as trading-locked", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}6`,
      templateId: "6",
      created: true,
      source: "created",
      template: { isActive: true, name: "Auto Template" },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: [] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["77"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "77", active: false },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      isApprovedForAll: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { tokenId: "77", isActive: true },
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const result = await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000bb", {
      title: "Dataset",
      assetIds: ["3"],
      metadataURI: "ipfs://inactive-dataset",
      royaltyBps: "600",
      price: "2000",
      duration: "3600",
    });

    expect(result.ownership).toEqual({
      owner: "0x00000000000000000000000000000000000000bb",
      approval: {
        submission: null,
        txHash: null,
        approvedForAll: true,
      },
    });
    expect(result.listing).toMatchObject({
      listingState: {
        isActive: true,
        datasetActive: false,
      },
      tradeReadiness: "listed-but-trading-locked-until-dataset-reactivated",
    });
    expect(voiceAssets.setApprovalForAll).not.toHaveBeenCalled();
  });

  it("fails early when the actor is not the current asset owner", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}7`,
      templateId: "7",
      created: false,
      source: "existing-active",
      template: { isActive: true, name: "Creator Template" },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn(),
      getListing: vi.fn(),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toThrow("commercialization requires current asset ownership");

    expect(datasets.createDataset).not.toHaveBeenCalled();
  });

  it("reports when the actor is authorized but not the current asset owner", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    const datasets = {
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      getVoiceHashFromTokenId: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: `0x${"1".repeat(64)}`,
      }),
      isAuthorized: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });

    let thrown: unknown;
    try {
      await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
        title: "Dataset",
        assetIds: ["1"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(thrown).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("actor is authorized but not owner"),
      diagnostics: {
        assetId: "1",
        owner: "0x00000000000000000000000000000000000000bb",
        actor: "0x00000000000000000000000000000000000000aa",
        actorAuthorized: true,
        voiceHash: `0x${"1".repeat(64)}`,
      },
    });
    expect(voiceAssets.getVoiceHashFromTokenId).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: "0x00000000000000000000000000000000000000aa",
      wireParams: ["1"],
    });
    expect(voiceAssets.isAuthorized).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: "0x00000000000000000000000000000000000000aa",
      wireParams: [`0x${"1".repeat(64)}`, "0x00000000000000000000000000000000000000aa"],
    });
    expect(datasets.createDataset).not.toHaveBeenCalled();
  });

  it("marks non-active listings as not actively listed", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}8`,
      templateId: "8",
      created: false,
      source: "requested",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["1"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["1", "2"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "2", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000cc",
      }),
      isApprovedForAll: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { tokenId: "2", isActive: false },
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const result = await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000cc", {
      title: "Dataset",
      assetIds: ["3"],
      metadataURI: "ipfs://inactive-listing",
      royaltyBps: "600",
      price: "2000",
      duration: "3600",
    });

    expect(result.summary.tradeReadiness).toBe("not-actively-listed");
  });

  it("throws when the created dataset id never becomes visible", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}5`,
      templateId: "5",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn()
        .mockResolvedValue({ statusCode: 200, body: ["10", "11"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000aa",
      }),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xdataset-receipt");

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toThrow("create-dataset-and-list-for-sale could not resolve the created dataset id from creator state");
    setTimeoutSpy.mockRestore();
  });

  it("derives the signer from signer-backed auth and retries listing readback until the listing stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ workflow: signerPrivateKey });

    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: unknown) => Promise<unknown>) => work({})),
      },
    } as never;
    const signerAddress = "0x12b66bbe381d5503b55CA7aA9F73983a8d8e85cE";
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}9`,
      templateId: "9",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["11"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["11", "12"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "12", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: signerAddress })
        .mockResolvedValueOnce({ statusCode: 200, body: signerAddress }),
      isApprovedForAll: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: {} })
        .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "12", isActive: true } }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const result = await runCreateDatasetAndListForSaleWorkflow(
      context,
      { ...auth, signerId: "workflow" },
      undefined,
      {
        title: "Dataset",
        assetIds: ["1"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    );

    expect(context.providerRouter.withProvider).toHaveBeenCalledTimes(1);
    expect(result.summary.signerAddress).toBe(signerAddress);
    expect(marketplace.getListing).toHaveBeenCalledTimes(2);
    setTimeoutSpy.mockRestore();
  });

  it("falls back to lowercase signer diagnostics when address normalization returns null", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      setApprovalForAll: vi.fn(),
      isApprovedForAll: vi.fn(),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "SignerAlias", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toMatchObject({
      statusCode: 409,
      diagnostics: {
        actor: "SignerAlias",
      },
    });
  });

  it("throws when signer-backed auth is required but no signer mapping is configured", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: unknown) => Promise<unknown>) => work({})),
      },
    } as never;
    mocks.createDatasetsPrimitiveService.mockReturnValue({});
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({});
    mocks.createMarketplacePrimitiveService.mockReturnValue({});

    await expect(runCreateDatasetAndListForSaleWorkflow(
      context,
      { ...auth, signerId: "workflow" },
      undefined,
      {
        title: "Dataset",
        assetIds: ["1"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    )).rejects.toThrow("create-dataset-and-list-for-sale requires signer-backed auth");
  });

  it("throws when signer-backed auth is requested without a signer id", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: unknown) => Promise<unknown>) => work({})),
      },
    } as never;
    mocks.createDatasetsPrimitiveService.mockReturnValue({});
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({});
    mocks.createMarketplacePrimitiveService.mockReturnValue({});

    await expect(runCreateDatasetAndListForSaleWorkflow(
      context,
      auth,
      undefined,
      {
        title: "Dataset",
        assetIds: ["1"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    )).rejects.toThrow("create-dataset-and-list-for-sale requires signer-backed auth");
  });

  it("reports unauthorized commercialization when voice-hash introspection fails", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      getVoiceHashFromTokenId: vi.fn().mockRejectedValue(new Error("lookup failed")),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("actor is not current owner"),
      diagnostics: {
        assetId: "1",
        owner: "0x00000000000000000000000000000000000000bb",
        actor: "0x00000000000000000000000000000000000000aa",
        actorAuthorized: null,
        voiceHash: null,
      },
    });

    expect(voiceAssets.isApprovedForAll).not.toHaveBeenCalled();
  });

  it("reports unauthorized commercialization when authorization introspection is unavailable", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      getVoiceHashFromTokenId: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: `0x${"2".repeat(64)}`,
      }),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("actor is not current owner"),
      diagnostics: {
        actorAuthorized: null,
        voiceHash: `0x${"2".repeat(64)}`,
      },
    });
  });

  it("reports unauthorized commercialization when authorization introspection throws", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn(),
      createDataset: vi.fn(),
    });
    const voiceAssets = {
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
      getVoiceHashFromTokenId: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: `0x${"3".repeat(64)}`,
      }),
      isAuthorized: vi.fn().mockRejectedValue(new Error("authorization unavailable")),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringContaining("actor is not current owner"),
      diagnostics: {
        actorAuthorized: null,
        voiceHash: `0x${"3".repeat(64)}`,
      },
    });

    expect(voiceAssets.isAuthorized).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: "0x00000000000000000000000000000000000000aa",
      wireParams: [`0x${"3".repeat(64)}`, "0x00000000000000000000000000000000000000aa"],
    });
  });

  it("falls back to the final unstable listing read when listing stabilization never converges", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}b`,
      templateId: "11",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { unexpected: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { pending: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: ["55"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "55", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      isApprovedForAll: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "pending",
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const result = await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000dd", {
      title: "Dataset",
      assetIds: ["4"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "700",
      price: "1000",
      duration: "0",
    });

    expect(result.listing.read).toBe("pending");
    expect(result.summary.tradeReadiness).toBe("not-actively-listed");
    expect(marketplace.getListing).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("surfaces approval readback timeouts after submitting approval", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}c`,
      templateId: "12",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["10"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["10", "12"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "12", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isApprovedForAll: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValue({ statusCode: 200, body: false }),
      setApprovalForAll: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xapproval-write" },
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xapproval-receipt");

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toThrow('createDatasetAndListForSale.approvalRead readback timeout: false');

    setTimeoutSpy.mockRestore();
  });

  it("surfaces readback timeouts with null diagnostics when the final body is undefined", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}e`,
      templateId: "14",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["10"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["10", "14"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "14", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isApprovedForAll: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValue({ statusCode: 503 }),
      setApprovalForAll: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xapproval-write" },
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xapproval-receipt");

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toThrow("createDatasetAndListForSale.approvalRead readback timeout: null");

    setTimeoutSpy.mockRestore();
  });

  it("returns a null listing read when stabilization ends with an undefined body", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}f`,
      templateId: "15",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["30"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["30", "31"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "31", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000dd" }),
      isApprovedForAll: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      setApprovalForAll: vi.fn(),
    };
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn().mockResolvedValue({
        statusCode: 200,
      }),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const result = await runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000dd", {
      title: "Dataset",
      assetIds: ["4"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "700",
      price: "1000",
      duration: "0",
    });

    expect(result.listing.read).toBeNull();
    expect(result.summary.tradeReadiness).toBe("not-actively-listed");
    setTimeoutSpy.mockRestore();
  });

  it("throws when the created dataset is read back under a different owner", async () => {
    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never;
    mocks.resolveDatasetLicenseTemplate.mockResolvedValue({
      templateHash: `0x${"0".repeat(63)}a`,
      templateId: "10",
      created: false,
      source: "existing-active",
      template: { isActive: true },
    });
    const datasets = {
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["10"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["10", "12"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "12", active: true },
      }),
    };
    const voiceAssets = {
      ownerOf: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: "0x00000000000000000000000000000000000000aa",
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: "0x00000000000000000000000000000000000000bb",
        }),
      isApprovedForAll: vi.fn(),
      setApprovalForAll: vi.fn(),
    };
    mocks.createDatasetsPrimitiveService.mockReturnValue(datasets);
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(voiceAssets);
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn(),
      getListing: vi.fn(),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce("0xdataset-receipt");

    await expect(runCreateDatasetAndListForSaleWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      title: "Dataset",
      assetIds: ["1"],
      metadataURI: "ipfs://dataset",
      royaltyBps: "500",
      price: "1000",
      duration: "0",
    })).rejects.toThrow("dataset 12 is owned by 0x00000000000000000000000000000000000000bb, expected signer 0x00000000000000000000000000000000000000aa");
  });

  it("throws when signer-backed auth resolves an unmapped signer id", async () => {
    process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({ other: signerPrivateKey });

    const context = {
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: unknown) => Promise<unknown>) => work({})),
      },
    } as never;
    mocks.createDatasetsPrimitiveService.mockReturnValue({});
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({});
    mocks.createMarketplacePrimitiveService.mockReturnValue({});

    await expect(runCreateDatasetAndListForSaleWorkflow(
      context,
      { ...auth, signerId: "workflow" },
      undefined,
      {
        title: "Dataset",
        assetIds: ["1"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
      },
    )).rejects.toThrow("create-dataset-and-list-for-sale requires signer-backed auth");
  });
});
