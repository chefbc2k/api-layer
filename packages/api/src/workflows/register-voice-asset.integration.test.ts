import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createVoiceAssetsPrimitiveService: vi.fn(),
  waitForWorkflowWriteReceipt: vi.fn(),
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
}));

vi.mock("./wait-for-write.js", () => ({
  waitForWorkflowWriteReceipt: mocks.waitForWorkflowWriteReceipt,
}));

import { createWorkflowRouter } from "./index.js";

describe("register-voice-asset workflow route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured asset-creation workflow result over HTTP", async () => {
    const features = {
      pitch: "100",
      volume: "80",
      speechRate: "90",
      timbre: "bright",
      formants: ["10", "20", "30"],
      harmonicsToNoise: "45",
      dynamicRange: "60",
    };
    const voiceHash = "0x3333333333333333333333333333333333333333333333333333333333333333";
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue({
      registerVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xreg", result: voiceHash },
      }),
      registerVoiceAssetForCaller: vi.fn(),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { voiceHash, owner: "0x0000000000000000000000000000000000000001" },
      }),
      updateBasicAcousticFeatures: vi.fn().mockResolvedValue({
        statusCode: 202,
        body: { txHash: "0xmeta" },
      }),
      getBasicAcousticFeatures: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: features,
      }),
    });
    mocks.waitForWorkflowWriteReceipt
      .mockResolvedValueOnce("0xreceipt-registration")
      .mockResolvedValueOnce("0xreceipt-metadata");

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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/register-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        ipfsHash: "QmWorkflowRoute",
        royaltyRate: "150",
        features,
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
      registration: {
        submission: {
          txHash: "0xreg",
          result: voiceHash,
        },
        txHash: "0xreceipt-registration",
        voiceAsset: {
          voiceHash,
          owner: "0x0000000000000000000000000000000000000001",
        },
      },
      metadataUpdate: {
        submission: {
          txHash: "0xmeta",
        },
        txHash: "0xreceipt-metadata",
        features,
      },
      voiceHash,
      summary: {
        owner: null,
        hasFeatures: true,
      },
    });
  });

  it("rejects invalid asset-creation workflow input before invoking primitives", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/register-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        ipfsHash: "QmInvalid",
        royaltyRate: "not-a-number",
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
    expect(mocks.createVoiceAssetsPrimitiveService).not.toHaveBeenCalled();
  });
});
