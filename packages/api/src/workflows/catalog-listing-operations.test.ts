import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDatasetsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
  runManageLicenseTemplateLifecycleWorkflow: vi.fn(),
  runInspectMarketplaceListingWorkflow: vi.fn(),
  runUpdateMarketplaceListingPriceWorkflow: vi.fn(),
  runCancelMarketplaceListingWorkflow: vi.fn(),
  runReleaseEscrowedAssetWorkflow: vi.fn(),
  runCreateMarketplaceListingWorkflow: vi.fn(),
}));

vi.mock("../modules/datasets/primitives/generated/index.js", () => ({
  createDatasetsPrimitiveService: mocks.createDatasetsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

vi.mock("./manage-license-template-lifecycle.js", async () => {
  const actual = await vi.importActual<typeof import("./manage-license-template-lifecycle.js")>("./manage-license-template-lifecycle.js");
  return {
    ...actual,
    runManageLicenseTemplateLifecycleWorkflow: mocks.runManageLicenseTemplateLifecycleWorkflow,
  };
});

vi.mock("./inspect-marketplace-listing.js", async () => {
  const actual = await vi.importActual<typeof import("./inspect-marketplace-listing.js")>("./inspect-marketplace-listing.js");
  return {
    ...actual,
    runInspectMarketplaceListingWorkflow: mocks.runInspectMarketplaceListingWorkflow,
  };
});

vi.mock("./update-marketplace-listing-price.js", async () => {
  const actual = await vi.importActual<typeof import("./update-marketplace-listing-price.js")>("./update-marketplace-listing-price.js");
  return {
    ...actual,
    runUpdateMarketplaceListingPriceWorkflow: mocks.runUpdateMarketplaceListingPriceWorkflow,
  };
});

vi.mock("./cancel-marketplace-listing.js", async () => {
  const actual = await vi.importActual<typeof import("./cancel-marketplace-listing.js")>("./cancel-marketplace-listing.js");
  return {
    ...actual,
    runCancelMarketplaceListingWorkflow: mocks.runCancelMarketplaceListingWorkflow,
  };
});

vi.mock("./release-escrowed-asset.js", async () => {
  const actual = await vi.importActual<typeof import("./release-escrowed-asset.js")>("./release-escrowed-asset.js");
  return {
    ...actual,
    runReleaseEscrowedAssetWorkflow: mocks.runReleaseEscrowedAssetWorkflow,
  };
});

vi.mock("./create-marketplace-listing.js", async () => {
  const actual = await vi.importActual<typeof import("./create-marketplace-listing.js")>("./create-marketplace-listing.js");
  return {
    ...actual,
    runCreateMarketplaceListingWorkflow: mocks.runCreateMarketplaceListingWorkflow,
  };
});

import { HttpError } from "../shared/errors.js";
import { catalogListingOperationsWorkflowSchema, runCatalogListingOperationsWorkflow } from "./catalog-listing-operations.js";

describe("runCatalogListingOperationsWorkflow", () => {
  const auth = {
    apiKey: "seller-key",
    label: "seller",
    roles: ["service"],
    allowGasless: false,
  };
  const context = {
    providerRouter: {
      withProvider: vi.fn().mockResolvedValue({
        blockNumber: 123n,
        status: 1n,
      }),
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runManageLicenseTemplateLifecycleWorkflow.mockResolvedValue({
      template: {
        source: "created",
        templateHash: `0x${"0".repeat(63)}5`,
        templateId: "5",
        current: { isActive: true },
      },
      create: { submission: { txHash: "0xtemplate" }, txHash: "0xtemplate", eventCount: 1 },
      update: null,
      status: null,
      summary: {
        templateHash: `0x${"0".repeat(63)}5`,
        templateId: "5",
        source: "created",
        created: true,
        updated: false,
        statusChanged: false,
        active: true,
      },
    });
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValue({
      listing: { tokenId: "11", isActive: true, price: "1000" },
      escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
      ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
      summary: { tokenId: "11", hasListing: true, inEscrow: true },
    });
    mocks.runUpdateMarketplaceListingPriceWorkflow.mockResolvedValue({
      listing: {
        before: { tokenId: "11", price: "1000" },
        submission: { txHash: "0xreprice" },
        txHash: "0xreprice",
        after: { tokenId: "11", price: "1500", isActive: true },
        eventCount: 1,
      },
      escrow: { inEscrow: true },
      summary: { tokenId: "11", newPrice: "1500" },
    });
    mocks.runCancelMarketplaceListingWorkflow.mockResolvedValue({
      listing: {
        before: { tokenId: "11", isActive: true },
        submission: { txHash: "0xcancel" },
        txHash: "0xcancel",
        after: { tokenId: "11", isActive: false },
        eventCount: 1,
      },
      escrow: { inEscrow: true, originalOwner: "0x00000000000000000000000000000000000000aa" },
      summary: { tokenId: "11", activeAfter: false },
    });
    mocks.runReleaseEscrowedAssetWorkflow.mockResolvedValue({
      ownership: {
        ownerBefore: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669",
        ownerAfter: "0x00000000000000000000000000000000000000aa",
      },
      escrow: {
        before: { inEscrow: true },
        after: { inEscrow: false },
        eventCount: 1,
      },
      release: {
        submission: { txHash: "0xrelease" },
        txHash: "0xrelease",
      },
      summary: {
        tokenId: "11",
        to: "0x00000000000000000000000000000000000000aa",
      },
    });
    mocks.runCreateMarketplaceListingWorkflow.mockResolvedValue({
      ownership: {
        ownerBefore: "0x00000000000000000000000000000000000000aa",
        ownerAfter: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669",
        approval: { submission: null, txHash: null, approvedForAllBefore: true, approvedForAllAfter: true },
      },
      listing: {
        submission: { txHash: "0xrelist" },
        txHash: "0xrelist",
        read: { tokenId: "11", isActive: true, price: "2200" },
        eventCount: 1,
      },
      escrow: {
        read: { inEscrow: true, originalOwner: "0x00000000000000000000000000000000000000aa" },
        eventCount: 1,
      },
      summary: {
        tokenId: "11",
        seller: "0x00000000000000000000000000000000000000aa",
        price: "2200",
        duration: "86400",
      },
    });
  });

  function datasetService(overrides?: Partial<Record<string, unknown>>) {
    const base = {
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          datasetId: "11",
          assetIds: ["1"],
          licenseTemplateId: "2",
          metadataURI: "ipfs://dataset",
          royaltyBps: "250",
          active: true,
        },
      }),
      appendAssets: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xappend" } }),
      removeAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xremove" } }),
      setLicense: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xlicense" } }),
      setMetadata: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xmetadata" } }),
      setRoyalty: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xroyalty" } }),
      setDatasetStatus: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xstatus" } }),
      assetsAppendedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xappend" }] }),
      assetRemovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xremove" }] }),
      licenseChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xlicense" }] }),
      metadataChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xmetadata" }] }),
      royaltySetEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xroyalty" }] }),
      datasetStatusChangedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xstatus" }] }),
    };
    return Object.assign(base, overrides);
  }

  it("runs dataset/package maintenance plus listing inspection only", async () => {
    const service = datasetService({
      getDataset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2", "3"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "3"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "3"],
            licenseTemplateId: "5",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "3"],
            licenseTemplateId: "5",
            metadataURI: "ipfs://updated-dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "3"],
            licenseTemplateId: "5",
            metadataURI: "ipfs://updated-dataset",
            royaltyBps: "300",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "3"],
            licenseTemplateId: "5",
            metadataURI: "ipfs://updated-dataset",
            royaltyBps: "300",
            active: false,
          },
        }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xappend")
      .mockResolvedValueOnce("0xremove")
      .mockResolvedValueOnce("0xlicense")
      .mockResolvedValueOnce("0xmetadata")
      .mockResolvedValueOnce("0xroyalty")
      .mockResolvedValueOnce("0xstatus");

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
        templateLifecycle: {
          create: {},
        },
        maintenance: {
          appendAssetIds: ["2", "3"],
          removeAssetId: "2",
          setMetadataURI: "ipfs://updated-dataset",
          setRoyaltyBps: "300",
          setActive: false,
        },
      },
      listing: {
        inspect: true,
      },
    });

    expect(result.packaging.templateLifecycle?.summary.templateId).toBe("5");
    expect(result.packaging.maintenance.appendAssets?.txHash).toBe("0xappend");
    expect(result.packaging.maintenance.removeAsset?.txHash).toBe("0xremove");
    expect(result.packaging.maintenance.setLicense?.txHash).toBe("0xlicense");
    expect(result.packaging.maintenance.setMetadata?.txHash).toBe("0xmetadata");
    expect(result.packaging.maintenance.setRoyalty?.txHash).toBe("0xroyalty");
    expect(result.packaging.maintenance.setDatasetStatus?.txHash).toBe("0xstatus");
    expect(result.listing.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
    expect(result.listing.isTradable).toBe(false);
  });

  it("runs listing inspection plus reprice", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: true, price: "1000" },
        escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
        ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
        summary: { tokenId: "11", hasListing: true, inEscrow: true },
      })
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: true, price: "1500" },
        escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
        ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
        summary: { tokenId: "11", hasListing: true, inEscrow: true },
      });

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
      },
      listing: {
        inspect: true,
        reprice: {
          newPrice: "1500",
        },
      },
    });

    expect(mocks.runUpdateMarketplaceListingPriceWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      tokenId: "11",
      newPrice: "1500",
    });
    expect(result.listing.reprice?.summary.newPrice).toBe("1500");
    expect(result.summary.isTradable).toBe(true);
  });

  it("runs cancel plus release plus relist", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: true, price: "1000" },
        escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
        ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
        summary: { tokenId: "11", hasListing: true, inEscrow: true },
      })
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: false, price: "1000" },
        escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
        ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
        summary: { tokenId: "11", hasListing: true, inEscrow: true },
      })
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: false, price: "1000" },
        escrow: { assetState: "0", originalOwner: "0x0000000000000000000000000000000000000000", inEscrow: false },
        ownership: { owner: "0x00000000000000000000000000000000000000aa" },
        summary: { tokenId: "11", hasListing: true, inEscrow: false },
      })
      .mockResolvedValueOnce({
        listing: { tokenId: "11", isActive: true, price: "2200" },
        escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
        ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
        summary: { tokenId: "11", hasListing: true, inEscrow: true },
      });

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
      },
      listing: {
        cancel: true,
        release: {},
        relist: {
          price: "2200",
          duration: "86400",
        },
      },
    });

    expect(mocks.runCancelMarketplaceListingWorkflow).toHaveBeenCalledOnce();
    expect(mocks.runReleaseEscrowedAssetWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      tokenId: "11",
      to: "0x00000000000000000000000000000000000000aa",
    });
    expect(mocks.runCreateMarketplaceListingWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      tokenId: "11",
      price: "2200",
      duration: "86400",
    });
    expect(result.summary.relisted).toBe(true);
    expect(result.summary.released).toBe(true);
    expect(result.listing.tradeReadiness).toBe("listed-and-tradable");
  });

  it("preserves the inactive or trading-locked branch", async () => {
    const service = datasetService({
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          datasetId: "11",
          assetIds: ["1"],
          licenseTemplateId: "2",
          metadataURI: "ipfs://dataset",
          royaltyBps: "250",
          active: false,
        },
      }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
      },
      listing: {
        inspect: true,
      },
    });

    expect(result.listing.tradeReadiness).toBe("listed-but-trading-locked-until-dataset-reactivated");
    expect(result.summary.isTradable).toBe(false);
  });

  it("surfaces child-workflow failure propagation", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runUpdateMarketplaceListingPriceWorkflow.mockRejectedValueOnce(new Error("listing update failed"));

    await expect(
      runCatalogListingOperationsWorkflow(context, auth, undefined, {
        dataset: {
          datasetId: "11",
        },
        listing: {
          reprice: {
            newPrice: "1500",
          },
        },
      }),
    ).rejects.toThrow("listing update failed");
  });

  it("blocks relist while the asset is still escrowed", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValueOnce({
      listing: { tokenId: "11", isActive: false, price: "1000" },
      escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: true },
      ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
      summary: { tokenId: "11", hasListing: true, inEscrow: true },
    });

    await expect(
      runCatalogListingOperationsWorkflow(context, auth, undefined, {
        dataset: {
          datasetId: "11",
        },
        listing: {
          relist: {
            price: "2200",
            duration: "86400",
          },
        },
      }),
    ).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
      message: "catalog-listing-operations relist blocked by escrow state: asset must be released before relisting",
    } satisfies Partial<HttpError>));
  });

  it("blocks relist while an existing listing is still active", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValueOnce({
      listing: { tokenId: "11", isActive: true, price: "1000" },
      escrow: { assetState: "1", originalOwner: "0x00000000000000000000000000000000000000aa", inEscrow: false },
      ownership: { owner: "0x00000000000000000000000000000000000000aa" },
      summary: { tokenId: "11", hasListing: true, inEscrow: false },
    });

    await expect(
      runCatalogListingOperationsWorkflow(context, auth, undefined, {
        dataset: {
          datasetId: "11",
        },
        listing: {
          relist: {
            price: "2200",
            duration: "86400",
          },
        },
      }),
    ).rejects.toEqual(expect.objectContaining({
      statusCode: 409,
      message: "catalog-listing-operations relist blocked by listing state: existing listing is still active",
    } satisfies Partial<HttpError>));
  });

  it("returns null trade readiness when no listing inspection exists", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
      },
      listing: {
        inspect: false,
        cancel: false,
      },
    });

    expect(mocks.runInspectMarketplaceListingWorkflow).not.toHaveBeenCalled();
    expect(result.listing.inspectionBefore).toBeNull();
    expect(result.listing.tradeReadiness).toBeNull();
    expect(result.summary.isTradable).toBe(false);
  });

  it("handles receipt-less maintenance writes and retries malformed dataset readbacks", async () => {
    const service = datasetService({
      getDataset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: "not-an-array",
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: { next: "300" },
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "300",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "300",
            active: "false",
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "300",
            active: false,
          },
        }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
        maintenance: {
          appendAssetIds: ["2"],
          setRoyaltyBps: "300",
          setActive: false,
        },
      },
      listing: {
        inspect: false,
        cancel: false,
      },
    });

    expect(service.assetsAppendedEventQuery).not.toHaveBeenCalled();
    expect(service.royaltySetEventQuery).not.toHaveBeenCalled();
    expect(service.datasetStatusChangedEventQuery).not.toHaveBeenCalled();
    expect(result.packaging.maintenance.appendAssets).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.packaging.maintenance.setRoyalty).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.packaging.maintenance.setDatasetStatus).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.packaging.after).toEqual(expect.objectContaining({
      assetIds: ["1", "2"],
      royaltyBps: "300",
      active: false,
    }));
  });

  it("reports inactive listings as not actively listed", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValueOnce({
      listing: { tokenId: "11", isActive: false, price: "1000" },
      escrow: { assetState: "0", originalOwner: "0x0000000000000000000000000000000000000000", inEscrow: false },
      ownership: { owner: "0x00000000000000000000000000000000000000aa" },
      summary: { tokenId: "11", hasListing: true, inEscrow: false },
    });

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
      },
      listing: {
        inspect: true,
      },
    });

    expect(result.listing.tradeReadiness).toBe("not-actively-listed");
    expect(result.summary.activeListing).toBe(false);
  });

  it("requires a release target when escrow has no recoverable original owner", async () => {
    const service = datasetService();
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.runInspectMarketplaceListingWorkflow.mockResolvedValueOnce({
      listing: { tokenId: "11", isActive: false, price: "1000" },
      escrow: { assetState: "1", originalOwner: "not-an-address", inEscrow: true },
      ownership: { owner: "0xa14088AcbF0639EF1C3655768a3001E6B8DC9669" },
      summary: { tokenId: "11", hasListing: true, inEscrow: true },
    });

    await expect(
      runCatalogListingOperationsWorkflow(context, auth, undefined, {
        dataset: {
          datasetId: "11",
        },
        listing: {
          release: {},
        },
      }),
    ).rejects.toEqual(expect.objectContaining({
      statusCode: 400,
      message: "catalog-listing-operations release requires explicit to address or escrow originalOwner",
    } satisfies Partial<HttpError>));
  });

  it("rejects conflicting template lifecycle and direct template assignment inputs", () => {
    expect(() => catalogListingOperationsWorkflowSchema.parse({
      dataset: {
        datasetId: "11",
        templateLifecycle: {
          create: {},
        },
        maintenance: {
          setLicenseTemplateId: "5",
        },
      },
    })).toThrow(
      "setLicenseTemplateId cannot be combined with templateLifecycle in catalog-listing-operations",
    );
  });

  it("handles receipt-less remove and license maintenance writes without querying events", async () => {
    const service = datasetService({
      getDataset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1", "2"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "9",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
        maintenance: {
          removeAssetId: "2",
          setLicenseTemplateId: "9",
        },
      },
      listing: {
        inspect: false,
        cancel: false,
      },
    });

    expect(service.assetRemovedEventQuery).not.toHaveBeenCalled();
    expect(service.licenseChangedEventQuery).not.toHaveBeenCalled();
    expect(result.packaging.maintenance.removeAsset).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.packaging.maintenance.setLicense).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
    }));
    expect(result.packaging.after).toEqual(expect.objectContaining({
      assetIds: ["1"],
      licenseTemplateId: "9",
    }));
  });

  it("handles a receipt-less template-lifecycle-driven license update without querying events", async () => {
    const service = datasetService({
      getDataset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "5",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
        templateLifecycle: {
          create: {},
        },
      },
      listing: {
        inspect: false,
        cancel: false,
      },
    });

    expect(service.licenseChangedEventQuery).not.toHaveBeenCalled();
    expect(result.packaging.templateLifecycle?.summary.templateId).toBe("5");
    expect(result.packaging.maintenance.setLicense).toEqual(expect.objectContaining({
      txHash: null,
      eventCount: 0,
      read: expect.objectContaining({
        licenseTemplateId: "5",
      }),
    }));
  });

  it("retries license readback until the new template id appears", async () => {
    const service = datasetService({
      getDataset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "2",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            datasetId: "11",
            assetIds: ["1"],
            licenseTemplateId: "9",
            metadataURI: "ipfs://dataset",
            royaltyBps: "250",
            active: true,
          },
        }),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runCatalogListingOperationsWorkflow(context, auth, undefined, {
      dataset: {
        datasetId: "11",
        maintenance: {
          setLicenseTemplateId: "9",
        },
      },
      listing: {
        inspect: false,
        cancel: false,
      },
    });

    expect(service.getDataset).toHaveBeenCalledTimes(3);
    expect(result.packaging.maintenance.setLicense?.read).toEqual(expect.objectContaining({
      licenseTemplateId: "9",
    }));
  });
});
