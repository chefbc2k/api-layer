import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createDatasetsPrimitiveService: vi.fn(),
  createMarketplacePrimitiveService: vi.fn(),
  createVoiceAssetsPrimitiveService: vi.fn(),
  createLicensingPrimitiveService: vi.fn(),
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

vi.mock("../modules/licensing/primitives/generated/index.js", () => ({
  createLicensingPrimitiveService: mocks.createLicensingPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { createWorkflowRouter } from "./index.js";

describe("create-dataset-and-list-for-sale workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured monetization workflow result over the router path", async () => {
    mocks.createLicensingPrimitiveService.mockReturnValue({
      getCreatorTemplates: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [`0x${"0".repeat(63)}5`],
      }),
      getTemplate: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { isActive: true, name: "Creator Template" },
      }),
      createTemplate: vi.fn(),
    });
    mocks.createDatasetsPrimitiveService.mockReturnValue({
      getDatasetsByCreator: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: ["10"] })
        .mockResolvedValueOnce({ statusCode: 200, body: ["10", "11"] }),
      createDataset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xdataset-write" },
      }),
      getDataset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { datasetId: "11", active: true },
      }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000aa",
      }),
      isApprovedForAll: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      setApprovalForAll: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xapproval-write" },
      }),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xlisting-write" },
      }),
      getListing: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { tokenId: "11", isActive: true },
      }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xdataset-receipt")
      .mockResolvedValueOnce("0xapproval-receipt")
      .mockResolvedValueOnce("0xlisting-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      addressBook: {
        toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-dataset-and-list-for-sale");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        title: "Dataset",
        assetIds: ["1", "2"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
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
    expect(response.payload).toEqual({
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
        datasetId: "11",
        read: { datasetId: "11", active: true },
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
        read: { tokenId: "11", isActive: true },
        listingState: {
          isActive: true,
          datasetActive: true,
        },
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
  });

  it("rejects invalid monetization workflow input before invoking primitives", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-dataset-and-list-for-sale");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        title: "Dataset",
        assetIds: ["bad"],
        metadataURI: "ipfs://dataset",
        royaltyBps: "500",
        price: "1000",
        duration: "0",
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
    expect(response.payload).toMatchObject({
      error: expect.stringContaining("Invalid string"),
    });
    expect(mocks.createDatasetsPrimitiveService).not.toHaveBeenCalled();
    expect(mocks.createMarketplacePrimitiveService).not.toHaveBeenCalled();
  });
});
