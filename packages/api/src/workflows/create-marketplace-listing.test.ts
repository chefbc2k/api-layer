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

import { runCreateMarketplaceListingWorkflow } from "./create-marketplace-listing.js";

describe("runCreateMarketplaceListingWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves when needed, lists, and confirms listing plus escrow state", async () => {
    const sequence: string[] = [];
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("owner-before");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("owner-after");
          return { statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" };
        }),
      isApprovedForAll: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("approval-before");
          return { statusCode: 200, body: false };
        })
        .mockImplementationOnce(async () => {
          sequence.push("approval-after");
          return { statusCode: 200, body: true };
        }),
      setApprovalForAll: vi.fn().mockImplementation(async () => {
        sequence.push("set-approval");
        return { statusCode: 202, body: { txHash: "0xapproval" } };
      }),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn().mockImplementation(async () => {
        sequence.push("list-asset");
        return { statusCode: 202, body: { txHash: "0xlist" } };
      }),
      getListing: vi.fn().mockImplementation(async () => {
        sequence.push("get-listing");
        return { statusCode: 200, body: { tokenId: "11", price: "25000000", isActive: true } };
      }),
      getAssetState: vi.fn().mockImplementation(async () => {
        sequence.push("get-asset-state");
        return { statusCode: 200, body: "1" };
      }),
      getOriginalOwner: vi.fn().mockImplementation(async () => {
        sequence.push("get-original-owner");
        return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
      }),
      isInEscrow: vi.fn().mockImplementation(async () => {
        sequence.push("is-in-escrow");
        return { statusCode: 200, body: true };
      }),
      assetListedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("listed-events");
        return [{ transactionHash: "0xlist-receipt" }];
      }),
      marketplaceAssetEscrowedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("escrowed-events");
        return [{ transactionHash: "0xlist-receipt" }];
      }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-approval");
        return "0xapproval-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-list");
        return "0xlist-receipt";
      });
    const context = {
      addressBook: { toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }) },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1101 })) });
        }),
      },
    } as never;

    const result = await runCreateMarketplaceListingWorkflow(context, auth as never, undefined, {
      tokenId: "11",
      price: "25000000",
      duration: "0",
    });

    expect(sequence).toEqual([
      "owner-before",
      "approval-before",
      "set-approval",
      "wait-approval",
      "approval-after",
      "list-asset",
      "wait-list",
      "receipt:workflow.createMarketplaceListing.list.receipt",
      "get-listing",
      "get-asset-state",
      "get-original-owner",
      "is-in-escrow",
      "owner-after",
      "listed-events",
      "escrowed-events",
    ]);
    expect(result.listing.txHash).toBe("0xlist-receipt");
    expect(result.escrow.eventCount).toBe(1);
    expect(result.ownership.approval.approvedForAllAfter).toBe(true);
  });

  it("skips approval when the operator is already approved", async () => {
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
      isApprovedForAll: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      setApprovalForAll: vi.fn(),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      listAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xlist" } }),
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "12", price: "1000", isActive: true } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      assetListedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xlist-receipt" }]),
      marketplaceAssetEscrowedEventQuery: vi.fn().mockResolvedValue([{ transactionHash: "0xlist-receipt" }]),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xlist-receipt");

    const result = await runCreateMarketplaceListingWorkflow({
      addressBook: { toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }) },
      providerRouter: { withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1102 })) })) },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {
      tokenId: "12",
      price: "1000",
      duration: "0",
    });

    expect(result.ownership.approval.txHash).toBeNull();
    expect(result.ownership.approval.submission).toBeNull();
  });

  it("returns zero event counts when the listing receipt is unavailable after write confirmation", async () => {
    const marketplace = {
      listAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xlist" } }),
      getListing: vi.fn().mockResolvedValue({ statusCode: 200, body: { tokenId: "13", price: "1500", isActive: true } }),
      getAssetState: vi.fn().mockResolvedValue({ statusCode: 200, body: "1" }),
      getOriginalOwner: vi.fn().mockResolvedValue({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" }),
      isInEscrow: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      assetListedEventQuery: vi.fn(),
      marketplaceAssetEscrowedEventQuery: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000aa" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" }),
      isApprovedForAll: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      setApprovalForAll: vi.fn(),
    });
    mocks.createMarketplacePrimitiveService.mockReturnValue(marketplace);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runCreateMarketplaceListingWorkflow({
      addressBook: { toJSON: () => ({ diamond: "0x0000000000000000000000000000000000000ddd" }) },
      providerRouter: { withProvider: vi.fn() },
    } as never, auth as never, "0x00000000000000000000000000000000000000aa", {
      tokenId: "13",
      price: "1500",
      duration: "0",
    });

    expect(result.listing).toMatchObject({
      txHash: null,
      eventCount: 0,
    });
    expect(result.escrow.eventCount).toBe(0);
    expect(marketplace.assetListedEventQuery).not.toHaveBeenCalled();
    expect(marketplace.marketplaceAssetEscrowedEventQuery).not.toHaveBeenCalled();
  });
});
