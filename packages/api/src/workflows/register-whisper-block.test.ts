import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createWhisperblockPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/whisperblock/primitives/generated/index.js", () => ({
  createWhisperblockPrimitiveService: mocks.createWhisperblockPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { hasTransactionHash, runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";

describe("runRegisterWhisperBlockWorkflow", () => {
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockImmediateTimeout() {
    return vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);
  }

  it("confirms fingerprint authenticity, optional key rotation, and optional access grant in order", async () => {
    const sequence: string[] = [];
    const receiptByTxHash = new Map([
      ["0xfingerprint-receipt", { blockNumber: 101 }],
      ["0xkey-receipt", { blockNumber: 102 }],
      ["0xgrant-receipt", { blockNumber: 103 }],
    ]);
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => {
          sequence.push(`receipt:${label}`);
          return work({
            getTransactionReceipt: vi.fn(async (txHash: string) => receiptByTxHash.get(txHash) ?? null),
          });
        }),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockImplementation(async () => {
        sequence.push("register-fingerprint");
        return { statusCode: 202, body: { txHash: "0xfingerprint-write" } };
      }),
      verifyVoiceAuthenticity: vi.fn().mockImplementation(async () => {
        sequence.push("verify-authenticity");
        return { statusCode: 200, body: true };
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("fingerprint-events");
        return [{ transactionHash: "0xfingerprint-receipt" }];
      }),
      generateAndSetEncryptionKey: vi.fn().mockImplementation(async () => {
        sequence.push("generate-key");
        return { statusCode: 202, body: { txHash: "0xkey-write" } };
      }),
      keyRotatedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("key-events");
        return [{ transactionHash: "0xkey-receipt" }];
      }),
      grantAccess: vi.fn().mockImplementation(async () => {
        sequence.push("grant-access");
        return { statusCode: 202, body: { txHash: "0xgrant-write" } };
      }),
      accessGrantedEventQuery: vi.fn().mockImplementation(async () => {
        sequence.push("access-events");
        return [{ transactionHash: "0xgrant-receipt" }];
      }),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockImplementationOnce(async () => {
        sequence.push("wait-fingerprint");
        return "0xfingerprint-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-key");
        return "0xkey-receipt";
      })
      .mockImplementationOnce(async () => {
        sequence.push("wait-access");
        return "0xgrant-receipt";
      });

    const result = await runRegisterWhisperBlockWorkflow(context, auth, "0xwallet", {
      voiceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      structuredFingerprintData: "0x1234",
      grant: {
        user: "0x00000000000000000000000000000000000000aa",
        duration: "3600",
      },
      generateEncryptionKey: true,
    });

    expect(sequence).toEqual([
      "register-fingerprint",
      "wait-fingerprint",
      "receipt:workflow.registerWhisperBlock.fingerprint.receipt",
      "verify-authenticity",
      "fingerprint-events",
      "generate-key",
      "wait-key",
      "receipt:workflow.registerWhisperBlock.encryptionKey.receipt",
      "key-events",
      "grant-access",
      "wait-access",
      "receipt:workflow.registerWhisperBlock.accessGrant.receipt",
      "access-events",
    ]);
    expect(result).toEqual({
      fingerprint: {
        submission: { txHash: "0xfingerprint-write" },
        txHash: "0xfingerprint-receipt",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: {
        submission: { txHash: "0xkey-write" },
        txHash: "0xkey-receipt",
        eventCount: 1,
      },
      accessGrant: {
        submission: { txHash: "0xgrant-write" },
        txHash: "0xgrant-receipt",
        eventCount: 1,
        grant: {
          user: "0x00000000000000000000000000000000000000aa",
          duration: "3600",
        },
      },
      summary: {
        voiceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        generateEncryptionKey: true,
        grantedUser: "0x00000000000000000000000000000000000000aa",
        grantedDuration: "3600",
      },
    });
  });

  it("supports the fingerprint-only path with stable null optional steps", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 201 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue([
        { transactionHash: "0xfingerprint-receipt" },
      ]),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      structuredFingerprintData: "0xabcd",
      generateEncryptionKey: false,
    });

    expect(result).toEqual({
      fingerprint: {
        submission: { txHash: "0xfingerprint-write" },
        txHash: "0xfingerprint-receipt",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        generateEncryptionKey: false,
        grantedUser: null,
        grantedDuration: null,
      },
    });
    expect(service.generateAndSetEncryptionKey).not.toHaveBeenCalled();
    expect(service.grantAccess).not.toHaveBeenCalled();
  });

  it("keeps the fingerprint event count at zero when receipt confirmation returns a null hash", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn(),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn(),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue(null);

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x2323232323232323232323232323232323232323232323232323232323232323",
      structuredFingerprintData: "0xcafe",
      generateEncryptionKey: false,
    });

    expect(result.fingerprint).toEqual({
      submission: { txHash: "0xfingerprint-write" },
      txHash: null,
      authenticityVerified: true,
      eventCount: 0,
    });
    expect(context.providerRouter.withProvider).not.toHaveBeenCalled();
    expect(service.voiceFingerprintUpdatedEventQuery).not.toHaveBeenCalled();
  });

  it("retries authenticity and event confirmation before succeeding", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => ({ blockNumber: txHash === "0xfingerprint-receipt" ? 301 : 302 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: false })
        .mockResolvedValueOnce({ statusCode: 200, body: true }),
      voiceFingerprintUpdatedEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ transactionHash: "0xfingerprint-receipt" }]),
      generateAndSetEncryptionKey: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xkey-write" },
      }),
      keyRotatedEventQuery: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ transactionHash: "0xkey-receipt" }]),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xfingerprint-receipt")
      .mockResolvedValueOnce("0xkey-receipt");

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
      structuredFingerprintData: "0x9876",
      generateEncryptionKey: true,
    });

    expect(service.verifyVoiceAuthenticity).toHaveBeenCalledTimes(2);
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(2);
    expect(service.keyRotatedEventQuery).toHaveBeenCalledTimes(2);
    expect(result.encryptionKey).toMatchObject({
      txHash: "0xkey-receipt",
      eventCount: 1,
    });
    setTimeoutSpy.mockRestore();
  });

  it("normalizes event-query route results with body arrays", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 501 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: [{ transactionHash: "0xfingerprint-receipt" }],
      }),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x5555555555555555555555555555555555555555555555555555555555555555",
      structuredFingerprintData: "0x7777",
      generateEncryptionKey: false,
    });

    expect(result.fingerprint.eventCount).toBe(1);
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(1);
  });

  it("retries transient event-query errors before confirming the fingerprint event", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 601 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn()
        .mockRejectedValueOnce(new Error("indexer unavailable"))
        .mockResolvedValueOnce([
          { transactionHash: "0xfingerprint-receipt" },
        ]),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x6666666666666666666666666666666666666666666666666666666666666666",
      structuredFingerprintData: "0x8888",
      generateEncryptionKey: false,
    });

    expect(result.fingerprint.eventCount).toBe(1);
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(2);
    setTimeoutSpy.mockRestore();
  });

  it("ignores non-object event entries while matching transaction hashes", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 651 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue([
        null,
        "unexpected-log",
        { transactionHash: "0xfingerprint-receipt" },
      ]),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x66666666666666666666666666666666666666666666666666666666666666aa",
      structuredFingerprintData: "0x8889",
      generateEncryptionKey: false,
    });

    expect(result.fingerprint.eventCount).toBe(3);
  });

  it("throws when authenticity verification never stabilizes", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 401 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: false,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn(),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x4444444444444444444444444444444444444444444444444444444444444444",
      structuredFingerprintData: "0x5555",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.verifyVoiceAuthenticity readback timeout");
    expect(service.verifyVoiceAuthenticity).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("surfaces transient authenticity read errors after retries are exhausted", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 451 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockRejectedValue(new Error("rpc timeout")),
      voiceFingerprintUpdatedEventQuery: vi.fn(),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      structuredFingerprintData: "0x4444",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.verifyVoiceAuthenticity readback timeout after transient read errors: rpc timeout");
    expect(service.verifyVoiceAuthenticity).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("surfaces transient event-query errors after retries are exhausted", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 701 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockRejectedValue(new Error("indexer unavailable")),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x7777777777777777777777777777777777777777777777777777777777777777",
      structuredFingerprintData: "0x9999",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.voiceFingerprintUpdated event query timeout after transient read errors: indexer unavailable");
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("throws when a confirmed fingerprint receipt cannot be read back", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => null),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn(),
      voiceFingerprintUpdatedEventQuery: vi.fn(),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
      structuredFingerprintData: "0x1111",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.fingerprint receipt missing after confirmation: 0xfingerprint-receipt");
    expect(service.verifyVoiceAuthenticity).not.toHaveBeenCalled();
  });

  it("keeps optional event counts at zero when downstream receipt resolution returns null hashes", async () => {
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 801 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue([
        { transactionHash: "0xfingerprint-receipt" },
      ]),
      generateAndSetEncryptionKey: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xkey-write" },
      }),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xgrant-write" },
      }),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xfingerprint-receipt")
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0x9999999999999999999999999999999999999999999999999999999999999999",
      structuredFingerprintData: "0x2222",
      grant: {
        user: "0x00000000000000000000000000000000000000bb",
        duration: "1800",
      },
      generateEncryptionKey: true,
    });

    expect(result.encryptionKey).toEqual({
      submission: { txHash: "0xkey-write" },
      txHash: null,
      eventCount: 0,
    });
    expect(result.accessGrant).toEqual({
      submission: { txHash: "0xgrant-write" },
      txHash: null,
      eventCount: 0,
      grant: {
        user: "0x00000000000000000000000000000000000000bb",
        duration: "1800",
      },
    });
    expect(service.keyRotatedEventQuery).not.toHaveBeenCalled();
    expect(service.accessGrantedEventQuery).not.toHaveBeenCalled();
  });

  it("times out with normalized empty event payloads when event routes return non-array bodies", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 901 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { unexpected: true },
      }),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      structuredFingerprintData: "0x3333",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.voiceFingerprintUpdated event query timeout: []");
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("times out with normalized empty event payloads when event routes return null", async () => {
    const setTimeoutSpy = mockImmediateTimeout();
    const context = {
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async () => ({ blockNumber: 951 })),
        })),
      },
    } as never;
    const service = {
      registerVoiceFingerprint: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xfingerprint-write" },
      }),
      verifyVoiceAuthenticity: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: true,
      }),
      voiceFingerprintUpdatedEventQuery: vi.fn().mockResolvedValue(null),
      generateAndSetEncryptionKey: vi.fn(),
      keyRotatedEventQuery: vi.fn(),
      grantAccess: vi.fn(),
      accessGrantedEventQuery: vi.fn(),
    };
    mocks.createWhisperblockPrimitiveService.mockReturnValue(service);
    mocks.waitForWorkflowWriteReceipt.mockResolvedValue("0xfingerprint-receipt");

    await expect(runRegisterWhisperBlockWorkflow(context, auth, undefined, {
      voiceHash: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      structuredFingerprintData: "0x5555",
      generateEncryptionKey: false,
    })).rejects.toThrow("registerWhisperBlock.voiceFingerprintUpdated event query timeout: []");
    expect(service.voiceFingerprintUpdatedEventQuery).toHaveBeenCalledTimes(20);
    setTimeoutSpy.mockRestore();
  });

  it("returns false when event matching is asked to compare against a missing transaction hash", () => {
    expect(hasTransactionHash([{ transactionHash: "0xabc" }], null)).toBe(false);
  });
});
