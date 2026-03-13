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

describe("marketplace listing workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured create-marketplace-listing workflow result over the router path", async () => {
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
      isApprovedForAll: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      setApprovalForAll: vi.fn(),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xlist" } }),
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "11", price: "25000000", isActive: true } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      assetListedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xlist-receipt" }]),
      marketplaceAssetEscrowedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xlist-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xlist-receipt");
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      addressBook: { toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }) },
      providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1501 })) })) },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-marketplace-listing");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = {
      body: { tokenId: "11", price: "25000000", duration: "0" },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") return "test-key";
        return undefined;
      },
    };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
    await handler(request, response);
    expect(response.statusCode).toBe(202);
    expect(response.payload).toMatchObject({
      listing: { txHash: "0xlist-receipt", eventCount: 1 },
      escrow: { eventCount: 1 },
    });
  });

  it("returns structured update, cancel, inspect, and release workflow results over the router paths", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
      providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1502 })) })) },
    } as never);

    mocks.createMarketplacePrimitiveService
      .mockReturnValueOnce({
        getListing: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", price: "100", isActive: true } })
          .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", price: "200", isActive: true } }),
        updateListingPrice: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xupdate" } }),
        getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
        getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
        isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
        listingPriceUpdatedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xupdate-receipt" }]),
      })
      .mockReturnValueOnce({
        getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "11", isActive: true } }),
        getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
        getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
        isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      })
      .mockReturnValueOnce({
        getListing: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: true } })
          .mockResolvedValueOnce({ statusCode: 200, body: { tokenId: "11", isActive: false } }),
        cancelListing: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcancel" } }),
        getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "0" }),
        getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
        isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: false }),
        listingCancelledEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xcancel-receipt" }]),
      })
      .mockReturnValueOnce({
        getAssetState: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: "1" })
          .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
        getOriginalOwner: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
          .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
        isInEscrow: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: true })
          .mockResolvedValueOnce({ statusCode: 200, body: false }),
        releaseAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelease" } }),
        assetReleasedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xrelease-receipt" }]),
      });
    mocks.createVoiceAssetsPrimitiveService
      .mockReturnValueOnce({ ownerOf: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }) })
      .mockReturnValueOnce({
        ownerOf: vi.fn()
          .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" })
          .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xupdate-receipt")
      .mockResolvedValueOnce("0xcancel-receipt")
      .mockResolvedValueOnce("0xrelease-receipt");

    const runRoute = async (path: string, body: Record<string, unknown>) => {
      const layer = router.stack.find((entry) => entry.route?.path === path);
      const handler = layer?.route?.stack?.[0]?.handle;
      const request = { body, header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; } };
      const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
      await handler(request, response);
      return response;
    };

    await expect(runRoute("/v1/workflows/update-marketplace-listing-price", { tokenId: "11", newPrice: "200" })).resolves.toMatchObject({
      statusCode: 202,
      payload: {
        listing: {
          txHash: "0xupdate-receipt",
          eventCount: 1,
        },
        summary: {
          tokenId: "11",
          newPrice: "200",
        },
      },
    });
    await expect(runRoute("/v1/workflows/inspect-marketplace-listing", { tokenId: "11" })).resolves.toMatchObject({
      statusCode: 202,
      payload: {
        summary: {
          tokenId: "11",
          hasListing: true,
          inEscrow: true,
        },
      },
    });
    await expect(runRoute("/v1/workflows/cancel-marketplace-listing", { tokenId: "11" })).resolves.toMatchObject({
      statusCode: 202,
      payload: {
        listing: {
          txHash: "0xcancel-receipt",
          eventCount: 1,
        },
        summary: {
          tokenId: "11",
          activeAfter: false,
        },
      },
    });
    await expect(runRoute("/v1/workflows/release-escrowed-asset", { tokenId: "11", to: "0x00000000000000000000000000000000000000aa" })).resolves.toMatchObject({
      statusCode: 202,
      payload: {
        release: {
          txHash: "0xrelease-receipt",
        },
        escrow: {
          eventCount: 1,
        },
        summary: {
          tokenId: "11",
          to: "0x00000000000000000000000000000000000000aa",
        },
      },
    });
  });

  it("rejects invalid create-marketplace-listing input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/create-marketplace-listing");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = { body: { tokenId: "bad", price: "1000", duration: "0" }, header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; } };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
    await handler(request, response);
    expect(response.statusCode).toBe(400);
    expect(mocks.createMarketplacePrimitiveService).not.toHaveBeenCalled();
  });

  it("rejects invalid release-escrowed-asset input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: { "test-key": { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false } },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/release-escrowed-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    const request = { body: { tokenId: "11", to: "bad-address" }, header(name: string) { return name.toLowerCase() === "x-api-key" ? "test-key" : undefined; } };
    const response = { statusCode: 200, payload: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(payload: unknown) { this.payload = payload; return this; } };
    await handler(request, response);
    expect(response.statusCode).toBe(400);
  });
});
