import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runTransferRightsWorkflow: vi.fn(),
  runOnboardRightsHolderWorkflow: vi.fn(),
  runRegisterWhisperBlockWorkflow: vi.fn(),
}));

vi.mock("../modules/voice-assets/index.js", async () => {
  const actual = await vi.importActual<typeof import("../modules/voice-assets/index.js")>("../modules/voice-assets/index.js");
  return {
    ...actual,
    runTransferRightsWorkflow: mocks.runTransferRightsWorkflow,
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

describe("transfer-and-resecure-voice-asset workflow route", () => {
  const role = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const voiceHash = "0x1111111111111111111111111111111111111111111111111111111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runTransferRightsWorkflow.mockResolvedValue({
      transfer: {
        mode: "transfer",
        submission: { txHash: "0xtransfer" },
        txHash: "0xtransfer",
        owner: "0x00000000000000000000000000000000000000bb",
      },
      summary: {
        from: "0x00000000000000000000000000000000000000aa",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: false,
        hasData: false,
      },
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
        role,
        account: "0x00000000000000000000000000000000000000cc",
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
          user: "0x00000000000000000000000000000000000000dd",
          duration: "900",
        },
      },
      summary: {
        voiceHash,
        generateEncryptionKey: true,
        grantedUser: "0x00000000000000000000000000000000000000dd",
        grantedDuration: "900",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the structured transfer-and-resecure response over the router path", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/transfer-and-resecure-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [
          {
            role,
            account: "0x00000000000000000000000000000000000000cc",
            expiryTime: "3600",
            authorizeVoice: true,
          },
        ],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: true,
          grant: {
            user: "0x00000000000000000000000000000000000000dd",
            duration: "900",
          },
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
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
      transfer: expect.any(Object),
      postTransferAccess: {
        voiceHash,
        collaborators: [
          {
            role,
            account: "0x00000000000000000000000000000000000000cc",
            expiryTime: "3600",
            authorizeVoice: true,
            result: expect.any(Object),
          },
        ],
        summary: {
          requestedCollaboratorCount: 1,
          completedCollaboratorCount: 1,
          roleGrantCount: 1,
          voiceAuthorizationCount: 1,
        },
      },
      security: expect.any(Object),
      summary: {
        voiceHash,
        tokenId: "17",
        previousOwner: "0x00000000000000000000000000000000000000aa",
        newOwner: "0x00000000000000000000000000000000000000bb",
        transferMode: "transfer",
        collaboratorCount: 1,
        voiceAuthorizationCount: 1,
        securityRefreshed: true,
        encryptionKeyGenerated: true,
        whisperGrantUser: "0x00000000000000000000000000000000000000dd",
      },
    });
  });

  it("rejects invalid transfer-and-resecure input before invoking child workflows", async () => {
    const router = createWorkflowRouter({
      apiKeys: {
        "seller-key": {
          apiKey: "seller-key",
          label: "seller",
          roles: ["service"],
          allowGasless: false,
        },
      },
    } as never);
    const layer = router.stack.find((entry) => entry.route?.path === "/v1/workflows/transfer-and-resecure-voice-asset");
    const handler = layer?.route?.stack?.[0]?.handle;
    expect(typeof handler).toBe("function");

    const request = {
      body: {
        voiceAsset: { voiceHash: "bad-hash" },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
      },
      header(name: string) {
        if (name.toLowerCase() === "x-api-key") {
          return "seller-key";
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
    expect(mocks.runTransferRightsWorkflow).not.toHaveBeenCalled();
    expect(mocks.runOnboardRightsHolderWorkflow).not.toHaveBeenCalled();
    expect(mocks.runRegisterWhisperBlockWorkflow).not.toHaveBeenCalled();
  });
});
