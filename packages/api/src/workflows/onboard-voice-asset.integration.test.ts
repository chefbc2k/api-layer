import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runRegisterVoiceAssetWorkflow: vi.fn(),
  runOnboardRightsHolderWorkflow: vi.fn(),
  runRegisterWhisperBlockWorkflow: vi.fn(),
}));

vi.mock("../modules/voice-assets/index.js", async () => {
  const actual = await vi.importActual<typeof import("../modules/voice-assets/index.js")>("../modules/voice-assets/index.js");
  return {
    ...actual,
    runRegisterVoiceAssetWorkflow: mocks.runRegisterVoiceAssetWorkflow,
  };
});

vi.mock("./onboard-rights-holder.js", async () => {
  const actual = await vi.importActual<typeof import("./onboard-rights-holder.js")>("./onboard-rights-holder.js");
  return {
    ...actual,
    runOnboardRightsHolderWorkflow: mocks.runOnboardRightsHolderWorkflow,
  };
});

vi.mock("./register-whisper-block.js", async () => {
  const actual = await vi.importActual<typeof import("./register-whisper-block.js")>("./register-whisper-block.js");
  return {
    ...actual,
    runRegisterWhisperBlockWorkflow: mocks.runRegisterWhisperBlockWorkflow,
  };
});

import { createWorkflowRouter } from "./index.js";

describe("onboard-voice-asset workflow route", () => {
  const voiceHash = "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runRegisterVoiceAssetWorkflow.mockResolvedValue({
      registration: {
        submission: { txHash: "0xasset" },
        txHash: "0xasset",
        voiceAsset: { owner: "0x00000000000000000000000000000000000000aa" },
      },
      metadataUpdate: null,
      voiceHash,
      summary: { owner: null, hasFeatures: false },
    });
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValue({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          authorization: { txHash: "0xauth" },
          txHash: "0xauth",
          isAuthorized: true,
        },
      ],
      summary: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 1,
      },
    });
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValue({
      fingerprint: {
        submission: { txHash: "0xfingerprint" },
        txHash: "0xfingerprint",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: {
        submission: { txHash: "0xkey" },
        txHash: "0xkey",
        eventCount: 1,
      },
      accessGrant: {
        submission: { txHash: "0xgrant" },
        txHash: "0xgrant",
        eventCount: 1,
        grant: {
          user: "0x00000000000000000000000000000000000000cc",
          duration: "900",
        },
      },
      summary: {
        voiceHash,
        generateEncryptionKey: true,
        grantedUser: "0x00000000000000000000000000000000000000cc",
        grantedDuration: "900",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured onboarding response over the router path", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/onboard-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        accessSetup: {
          role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          expiryTime: "3600",
          grantees: ["0x00000000000000000000000000000000000000bb"],
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: true,
          grant: {
            user: "0x00000000000000000000000000000000000000cc",
            duration: "900",
          },
        },
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
      asset: expect.any(Object),
      accessSetup: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        expiryTime: "3600",
        grantees: [
          {
            account: "0x00000000000000000000000000000000000000bb",
            result: expect.any(Object),
          },
        ],
        summary: {
          requestedGranteeCount: 1,
          completedGranteeCount: 1,
        },
      },
      security: expect.any(Object),
      summary: {
        voiceHash,
        assetOwner: null,
        grantedAccessActorCount: 1,
        encryptionKeyGenerated: true,
        whisperGrantUser: "0x00000000000000000000000000000000000000cc",
      },
    });
  });

  it("rejects invalid onboarding input before invoking child workflows", async () => {
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
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/onboard-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "bad",
        },
        security: {
          structuredFingerprintData: "0x1234",
        },
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
      error: expect.stringContaining("Invalid"),
    });
    expect(mocks.runRegisterVoiceAssetWorkflow).not.toHaveBeenCalled();
    expect(mocks.runOnboardRightsHolderWorkflow).not.toHaveBeenCalled();
    expect(mocks.runRegisterWhisperBlockWorkflow).not.toHaveBeenCalled();
  });
});
