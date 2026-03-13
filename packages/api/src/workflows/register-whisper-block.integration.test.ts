import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { createWorkflowRouter } from "./index.js";

describe("register-whisper-block workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured security workflow result over the router path", async () => {
    const receiptByTxHash = new Map([
      ["0xfingerprint-receipt", { blockNumber: 501 }],
      ["0xkey-receipt", { blockNumber: 502 }],
      ["0xgrant-receipt", { blockNumber: 503 }],
    ]);
    mocks.createWhisperblockPrimitiveService.mockReturnValue({
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
      keyRotatedEventQuery: vi.fn().mockResolvedValue([
        { transactionHash: "0xkey-receipt" },
      ]),
      grantAccess: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xgrant-write" },
      }),
      accessGrantedEventQuery: vi.fn().mockResolvedValue([
        { transactionHash: "0xgrant-receipt" },
      ]),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xfingerprint-receipt")
      .mockResolvedValueOnce("0xkey-receipt")
      .mockResolvedValueOnce("0xgrant-receipt");

    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      providerRouter: {
        withProvider: vi.fn().mockImplementation(async (_mode: string, _label: string, work: (provider: { getTransactionReceipt: (txHash: string) => Promise<unknown> }) => Promise<unknown>) => work({
          getTransactionReceipt: vi.fn(async (txHash: string) => receiptByTxHash.get(txHash) ?? null),
        })),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/register-whisper-block");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        structuredFingerprintData: "0x1234",
        grant: {
          user: "0x00000000000000000000000000000000000000aa",
          duration: "3600",
        },
        generateEncryptionKey: true,
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

    expect(response.statusCode).toBe(202);
    expect(response.payload).toEqual({
      fingerprint: {
        submission: {
          txHash: "0xfingerprint-write",
        },
        txHash: "0xfingerprint-receipt",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: {
        submission: {
          txHash: "0xkey-write",
        },
        txHash: "0xkey-receipt",
        eventCount: 1,
      },
      accessGrant: {
        submission: {
          txHash: "0xgrant-write",
        },
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

  it("rejects invalid security workflow input before invoking primitives", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "test-key": {
          apiKey: "test-key",
          label: "test",
          roles: ["service"],
          allowGasless: false,
        },
      },
      providerRouter: {
        withProvider: vi.fn(),
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/register-whisper-block");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceHash: "bad-hash",
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: true,
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
    expect(mocks.createWhisperblockPrimitiveService).not.toHaveBeenCalled();
  });
});
