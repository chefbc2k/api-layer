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

import { runRegisterVoiceAssetWorkflow } from "./register-voice-asset.js";

describe("runRegisterVoiceAssetWorkflow", () => {
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

  it("waits for registration, confirms the voice asset, and returns a structured result without metadata", async () => {
    const registrationBody = {
      txHash: "0xreg",
      result: "0x1111111111111111111111111111111111111111111111111111111111111111",
    };
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: registrationBody,
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          voiceHash: registrationBody.result,
          owner: "0x0000000000000000000000000000000000000001",
        },
      }),
      getTokenId: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: "104",
      }),
      updateBasicAcousticFeatures: vi.fn(),
      getBasicAcousticFeatures: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-registration");

    const result = await runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmVoice",
      royaltyRate: "150",
    });

    expect(service.registerVoiceAsset).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: ["QmVoice", "150"],
    });
    expect(mocks.waitForWorkflowWriteReceipt).toHaveBeenCalledWith(
      context,
      registrationBody,
      "registerVoiceAsset.registration",
    );
    expect(service.getVoiceAsset).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: undefined,
      wireParams: [registrationBody.result],
    });
    expect(result).toEqual({
      registration: {
        submission: registrationBody,
        txHash: "0xreceipt-registration",
        voiceAsset: {
          voiceHash: registrationBody.result,
          owner: "0x0000000000000000000000000000000000000001",
        },
        tokenId: "104",
      },
      metadataUpdate: null,
      voiceHash: registrationBody.result,
      summary: {
        owner: null,
        hasFeatures: false,
        tokenId: "104",
      },
    });
    expect(service.registerVoiceAssetForCaller).not.toHaveBeenCalled();
    expect(service.updateBasicAcousticFeatures).not.toHaveBeenCalled();
    expect(service.getBasicAcousticFeatures).not.toHaveBeenCalled();
  });

  it("uses the caller-specific registration path, waits for metadata, and confirms features readback", async () => {
    const sequence: string[] = [];
    const voiceHash = "0x2222222222222222222222222222222222222222222222222222222222222222";
    const features = {
      pitch: "120",
      volume: "70",
      speechRate: "85",
      timbre: "warm",
      formants: ["101", "202", "303"],
      harmonicsToNoise: "40",
      dynamicRange: "55",
    };
    const registrationBody = { txHash: "0xreg2", result: voiceHash };
    const metadataBody = { txHash: "0xmeta" };
    const service = {
      registerVoiceAsset: vi.fn(),
      registerVoiceAssetForCaller: vi.fn().mockImplementation(async () => {
        sequence.push("register");
        return { statusCode: 202, body: registrationBody };
      }),
      getVoiceAsset: vi.fn().mockImplementation(async () => {
        sequence.push("read-voice");
        return {
          statusCode: 200,
          body: {
            voiceHash,
            owner: "0x00000000000000000000000000000000000000aa",
          },
        };
      }),
      getTokenId: vi.fn().mockImplementation(async () => {
        sequence.push("read-token-id");
        return {
          statusCode: 200,
          body: "205",
        };
      }),
      updateBasicAcousticFeatures: vi.fn().mockImplementation(async () => {
        sequence.push("update-features");
        return { statusCode: 202, body: metadataBody };
      }),
      getBasicAcousticFeatures: vi.fn().mockImplementation(async () => {
        sequence.push("read-features");
        return { statusCode: 200, body: features };
      }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-registration");
        return "0xreceipt-registration";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-metadata");
        return "0xreceipt-metadata";
      });

    const result = await runRegisterVoiceAssetWorkflow(context, auth, "0xwallet", {
      ipfsHash: "QmVoiceWithOwner",
      royaltyRate: "175",
      owner: "0x00000000000000000000000000000000000000aa",
      features,
    });

    expect(sequence).toEqual([
      "register",
      "wait-registration",
      "read-voice",
      "read-token-id",
      "update-features",
      "wait-metadata",
      "read-features",
    ]);
    expect(service.registerVoiceAssetForCaller).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: "0xwallet",
      wireParams: ["QmVoiceWithOwner", "175", "0x00000000000000000000000000000000000000aa"],
    });
    expect(service.updateBasicAcousticFeatures).toHaveBeenCalledWith({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: "0xwallet",
      wireParams: [voiceHash, features],
    });
    expect(result).toEqual({
      registration: {
        submission: registrationBody,
        txHash: "0xreceipt-registration",
        voiceAsset: {
          voiceHash,
          owner: "0x00000000000000000000000000000000000000aa",
        },
        tokenId: "205",
      },
      metadataUpdate: {
        submission: metadataBody,
        txHash: "0xreceipt-metadata",
        features,
      },
      voiceHash,
      summary: {
        owner: "0x00000000000000000000000000000000000000aa",
        hasFeatures: true,
        tokenId: "205",
      },
    });
    expect(service.registerVoiceAsset).not.toHaveBeenCalled();
  });

  it("skips metadata update when registration does not yield a voice hash", async () => {
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xreg-no-hash", result: null },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn(),
      getTokenId: vi.fn(),
      updateBasicAcousticFeatures: vi.fn(),
      getBasicAcousticFeatures: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-registration");

    const result = await runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmNoHash",
      royaltyRate: "100",
      features: {
        pitch: "10",
      },
    });

    expect(result).toEqual({
      registration: {
        submission: {
          txHash: "0xreg-no-hash",
          result: null,
        },
        txHash: "0xreceipt-registration",
        voiceAsset: null,
        tokenId: null,
      },
      metadataUpdate: null,
      voiceHash: null,
      summary: {
        owner: null,
        hasFeatures: true,
        tokenId: null,
      },
    });
    expect(service.getVoiceAsset).not.toHaveBeenCalled();
    expect(service.getTokenId).not.toHaveBeenCalled();
    expect(service.updateBasicAcousticFeatures).not.toHaveBeenCalled();
    expect(service.getBasicAcousticFeatures).not.toHaveBeenCalled();
  });

  it("retries readbacks before succeeding", async () => {
    const features = {
      pitch: "120",
    };
    const voiceHash = "0x4444444444444444444444444444444444444444444444444444444444444444";
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xreg-retry", result: voiceHash },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 404,
          body: { error: "not ready" },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { voiceHash, owner: "0x0000000000000000000000000000000000000001" },
        }),
      getTokenId: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 404,
          body: { error: "not ready" },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: "309",
        }),
      updateBasicAcousticFeatures: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xmeta-retry" },
      }),
      getBasicAcousticFeatures: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { pitch: "0" },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: features,
        }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreceipt-registration")
      .mockResolvedValueOnce("0xreceipt-metadata");

    const result = await runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmRetry",
      royaltyRate: "100",
      features,
    });

    expect(service.getVoiceAsset).toHaveBeenCalledTimes(2);
    expect(service.getTokenId).toHaveBeenCalledTimes(2);
    expect(service.getBasicAcousticFeatures).toHaveBeenCalledTimes(2);
    expect(result.metadataUpdate).toMatchObject({
      txHash: "0xreceipt-metadata",
      features,
    });
  });

  it("retries after transient token-id read errors before succeeding", async () => {
    const voiceHash = "0x6666666666666666666666666666666666666666666666666666666666666666";
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xreg-transient", result: voiceHash },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { voiceHash, owner: "0x0000000000000000000000000000000000000001" },
      }),
      getTokenId: vi.fn()
        .mockRejectedValueOnce(new Error("rpc unavailable"))
        .mockResolvedValueOnce({
          statusCode: 200,
          body: 412n,
        }),
      updateBasicAcousticFeatures: vi.fn(),
      getBasicAcousticFeatures: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-registration");

    const result = await runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmTransient",
      royaltyRate: "100",
    });

    expect(service.getTokenId).toHaveBeenCalledTimes(2);
    expect(result.registration.tokenId).toBe("412");
    expect(result.summary.tokenId).toBe("412");
  });

  it("throws when registration readback never stabilizes", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: {
          txHash: "0xreg-timeout",
          result: "0x5555555555555555555555555555555555555555555555555555555555555555",
        },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 404,
        body: { error: "not ready" },
      }),
      getTokenId: vi.fn(),
      updateBasicAcousticFeatures: vi.fn(),
      getBasicAcousticFeatures: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-registration");

    await expect(runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmTimeout",
      royaltyRate: "100",
    })).rejects.toThrow("registerVoiceAsset.registrationRead readback timeout");
    expect(service.getVoiceAsset).toHaveBeenCalledTimes(40);
    setTimeoutSpy.mockRestore();
  });

  it("surfaces transient read errors after token-id retries are exhausted", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
    const voiceHash = "0x7777777777777777777777777777777777777777777777777777777777777777";
    const service = {
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: {
          txHash: "0xreg-token-timeout",
          result: voiceHash,
        },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { voiceHash, owner: "0x0000000000000000000000000000000000000001" },
      }),
      getTokenId: vi.fn().mockRejectedValue(new Error("rpc unavailable")),
      updateBasicAcousticFeatures: vi.fn(),
      getBasicAcousticFeatures: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xreceipt-registration");

    await expect(runRegisterVoiceAssetWorkflow(context, auth, undefined, {
      ipfsHash: "QmTokenTimeout",
      royaltyRate: "100",
    })).rejects.toThrow("registerVoiceAsset.tokenIdRead readback timeout after transient read errors: rpc unavailable");
    expect(service.getTokenId).toHaveBeenCalledTimes(40);
    setTimeoutSpy.mockRestore();
  });
});
