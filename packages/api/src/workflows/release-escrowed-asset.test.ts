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

import { runReleaseEscrowedAssetWorkflow } from "./release-escrowed-asset.js";

describe("runReleaseEscrowedAssetWorkflow", () => {
  const auth = { apiKey: "test-key", label: "test", roles: ["service"], allowGasless: false };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases an escrowed asset, confirms owner transfer, and confirms escrow exit", async () => {
    const sequence: string[] = [];
    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getAssetState: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("asset-state-before");
          return { statusCode: 200, body: "1" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("asset-state-after");
          return { statusCode: 200, body: "0" };
        }),
      getOriginalOwner: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("original-owner-before");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("original-owner-after");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        }),
      isInEscrow: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("in-escrow-before");
          return { statusCode: 200, body: true };
        })
        .mockImplementationOnce(async () => {
          sequence.push("in-escrow-after");
          return { statusCode: 200, body: false };
        }),
      releaseAsset: vi.fn().mockImplementation(async () => {
        sequence.push("release-asset");
        return { statusCode: 202, body: { txHash: "0xrelease-write" } };
      }),
      assetReleasedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("released-events");
        return [{ transactionHash: "0xrelease-receipt" }];
      }),
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockImplementationOnce(async () => {
          sequence.push("owner-before");
          return { statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" };
        })
        .mockImplementationOnce(async () => {
          sequence.push("owner-after");
          return { statusCode: 200, body: "0x00000000000000000000000000000000000000aa" };
        }),
    });
    mocks.waitForWorkflowWriteReceipt.mockImplementationOnce(async () => {
      sequence.push("wait-release");
      return "0xrelease-receipt";
    });

    const result = await runReleaseEscrowedAssetWorkflow({
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: {
          getTransactionReceipt: (txHash: string) => Promise<unknown>;
        }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({ getTransactionReceipt: vi.fn(async () => ({ blockNumber: 1401 })) });
        }),
      },
    } as never, auth as never, undefined, {
      tokenId: "11",
      to: "0x00000000000000000000000000000000000000aa",
    });

    expect(sequence).toEqual([
      "asset-state-before",
      "original-owner-before",
      "in-escrow-before",
      "owner-before",
      "release-asset",
      "wait-release",
      "receipt:workflow.releaseEscrowedAsset.release.receipt",
      "owner-after",
      "asset-state-after",
      "original-owner-after",
      "in-escrow-after",
      "released-events",
    ]);
    expect(result).toEqual({
      ownership: {
        ownerBefore: "0x0000000000000000000000000000000000000ddd",
        ownerAfter: "0x00000000000000000000000000000000000000aa",
      },
      escrow: {
        before: {
          assetState: "1",
          originalOwner: "0x00000000000000000000000000000000000000aa",
          inEscrow: true,
        },
        after: {
          assetState: "0",
          originalOwner: "0x00000000000000000000000000000000000000aa",
          inEscrow: false,
        },
        eventCount: 1,
      },
      release: {
        submission: { txHash: "0xrelease-write" },
        txHash: "0xrelease-receipt",
      },
      summary: {
        tokenId: "11",
        to: "0x00000000000000000000000000000000000000aa",
      },
    });
  });

  it("tolerates missing receipts and accepts null escrow readback after release", async () => {
    const assetReleasedEventQuery = vi.fn();

    mocks.createMarketplacePrimitiveService.mockReturnValue({
      getAssetState: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "1" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0" }),
      getOriginalOwner: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
      isInEscrow: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: true })
        .mockResolvedValueOnce({ statusCode: 200, body: null }),
      releaseAsset: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelease-write" } }),
      assetReleasedEventQuery,
    });
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      ownerOf: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: "0x0000000000000000000000000000000000000ddd" })
        .mockResolvedValueOnce({ statusCode: 200, body: "0x00000000000000000000000000000000000000bb" }),
    });
    mocks.waitForWorkflowWriteReceipt.mockResolvedValueOnce(null);

    const result = await runReleaseEscrowedAssetWorkflow({
      providerRouter: {
        withProvider: vi.fn(),
      },
    } as never, auth as never, undefined, {
      tokenId: "12",
      to: "0x00000000000000000000000000000000000000bb",
    });

    expect(assetReleasedEventQuery).not.toHaveBeenCalled();
    expect(result).toEqual({
      ownership: {
        ownerBefore: "0x0000000000000000000000000000000000000ddd",
        ownerAfter: "0x00000000000000000000000000000000000000bb",
      },
      escrow: {
        before: {
          assetState: "1",
          originalOwner: "0x00000000000000000000000000000000000000bb",
          inEscrow: true,
        },
        after: {
          assetState: "0",
          originalOwner: "0x00000000000000000000000000000000000000bb",
          inEscrow: null,
        },
        eventCount: 0,
      },
      release: {
        submission: { txHash: "0xrelease-write" },
        txHash: null,
      },
      summary: {
        tokenId: "12",
        to: "0x00000000000000000000000000000000000000bb",
      },
    });
  });
});
