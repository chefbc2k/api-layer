import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createVoiceAssetsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

vi.mock("../../../workflows/wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { runTransferRightsWorkflow } from "./transfer-rights.js";

describe("runTransferRightsWorkflow", () => {
  const context = {} as never;
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("waits for a transfer receipt, confirms ownerOf, and returns a structured transfer result", async () => {
    const transferBody = { txHash: "0xtransfer" };
    const service = {
      transferFromVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: transferBody,
      }),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn(),
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000aa",
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-transfer");

    const result = await runTransferRightsWorkflow(context, auth, undefined, {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x00000000000000000000000000000000000000aa",
      tokenId: "12",
      safe: false,
    });

    expect(service.transferFromVoiceAsset).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: ["0x0000000000000000000000000000000000000001", "0x00000000000000000000000000000000000000aa", "12"],
    });
    expect(mocks.waitForWorkflowWriteReceipt).toHaveBeenCalledWith(
      context,
      transferBody,
      "transferRights.transfer",
    );
    expect(service.ownerOf).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: ["12"],
    });
    expect(result).toEqual({
      transfer: {
        mode: "transfer",
        submission: transferBody,
        txHash: "0xreceipt-transfer",
        owner: "0x00000000000000000000000000000000000000aa",
      },
      summary: {
        from: "0x0000000000000000000000000000000000000001",
        to: "0x00000000000000000000000000000000000000aa",
        tokenId: "12",
        safe: false,
        hasData: false,
      },
    });
  });

  it("uses the safe transfer path without data", async () => {
    const service = {
      transferFromVoiceAsset: vi.fn(),
      safeTransferFromAddressAddressUint256: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xsafe" },
      }),
      safeTransferFromAddressAddressUint256Bytes: vi.fn(),
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000bb",
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-safe");

    const result = await runTransferRightsWorkflow(context, auth, "0xwallet", {
      from: "0x0000000000000000000000000000000000000002",
      to: "0x00000000000000000000000000000000000000bb",
      tokenId: "13",
      safe: true,
    });

    expect(service.safeTransferFromAddressAddressUint256).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: "0xwallet",
      wireParams: ["0x0000000000000000000000000000000000000002", "0x00000000000000000000000000000000000000bb", "13"],
    });
    expect(service.safeTransferFromAddressAddressUint256Bytes).not.toHaveBeenCalled();
    expect(result.transfer.mode).toBe("safe");
  });

  it("uses the safe transfer path with data", async () => {
    const service = {
      transferFromVoiceAsset: vi.fn(),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xsafe-data" },
      }),
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x00000000000000000000000000000000000000cc",
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-safe-data");

    const result = await runTransferRightsWorkflow(context, auth, undefined, {
      from: "0x0000000000000000000000000000000000000003",
      to: "0x00000000000000000000000000000000000000cc",
      tokenId: "14",
      safe: true,
      data: "0x1234",
    });

    expect(service.safeTransferFromAddressAddressUint256Bytes).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: ["0x0000000000000000000000000000000000000003", "0x00000000000000000000000000000000000000cc", "14", "0x1234"],
    });
    expect(result).toMatchObject({
      transfer: {
        mode: "safe-with-data",
        txHash: "0xreceipt-safe-data",
        owner: "0x00000000000000000000000000000000000000cc",
      },
      summary: {
        hasData: true,
      },
    });
  });

  it("retries owner readback before succeeding", async () => {
    const service = {
      transferFromVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xretry" },
      }),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn(),
      ownerOf: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: "0x0000000000000000000000000000000000000001",
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: "0x00000000000000000000000000000000000000dd",
        }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-retry");

    const result = await runTransferRightsWorkflow(context, auth, undefined, {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x00000000000000000000000000000000000000dd",
      tokenId: "15",
      safe: false,
    });

    expect(service.ownerOf).toHaveBeenCalledTimes(2);
    expect(result.transfer.owner).toBe("0x00000000000000000000000000000000000000dd");
  });

  it("throws when owner readback never stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const service = {
      transferFromVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xtimeout" },
      }),
      safeTransferFromAddressAddressUint256: vi.fn(),
      safeTransferFromAddressAddressUint256Bytes: vi.fn(),
      ownerOf: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "0x0000000000000000000000000000000000000001",
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-timeout");

    await expect(runTransferRightsWorkflow(context, auth, undefined, {
      from: "0x0000000000000000000000000000000000000001",
      to: "0x00000000000000000000000000000000000000ee",
      tokenId: "16",
      safe: false,
    })).rejects.toThrow("transferRights.ownerOf.16 readback timeout");
    expect(service.ownerOf).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });
});
