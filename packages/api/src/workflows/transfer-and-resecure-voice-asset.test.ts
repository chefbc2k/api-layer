import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { runTransferAndResecureVoiceAssetWorkflow } from "./transfer-and-resecure-voice-asset.js";

describe("runTransferAndResecureVoiceAssetWorkflow", () => {
  const context = {} as never;
  const auth = {
    apiKey: "seller-key",
    label: "seller",
    roles: ["service"],
    allowGasless: false,
  };
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
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash,
        generateEncryptionKey: false,
        grantedUser: null,
        grantedDuration: null,
      },
    });
  });

  it("runs the transfer-only path", async () => {
    const result = await runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      transfer: {
        from: "0x00000000000000000000000000000000000000aa",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: false,
      },
      postTransferAccess: [],
    });

    expect(mocks.runTransferRightsWorkflow).toHaveBeenCalledOnce();
    expect(mocks.runOnboardRightsHolderWorkflow).not.toHaveBeenCalled();
    expect(mocks.runRegisterWhisperBlockWorkflow).not.toHaveBeenCalled();
    expect(result.summary).toEqual({
      voiceHash,
      tokenId: "17",
      previousOwner: "0x00000000000000000000000000000000000000aa",
      newOwner: "0x00000000000000000000000000000000000000bb",
      transferMode: "transfer",
      collaboratorCount: 0,
      voiceAuthorizationCount: 0,
      securityRefreshed: false,
      encryptionKeyGenerated: false,
      whisperGrantUser: null,
    });
  });

  it("runs transfer plus post-transfer authorization", async () => {
    const result = await runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
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
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      role,
      account: "0x00000000000000000000000000000000000000cc",
      expiryTime: "3600",
      voiceHashes: [voiceHash],
    });
    expect(result.postTransferAccess.summary).toEqual({
      requestedCollaboratorCount: 1,
      completedCollaboratorCount: 1,
      roleGrantCount: 1,
      voiceAuthorizationCount: 1,
    });
  });

  it("runs transfer plus re-secure with encryption", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
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
      accessGrant: null,
      summary: {
        voiceHash,
        generateEncryptionKey: true,
        grantedUser: null,
        grantedDuration: null,
      },
    });

    const result = await runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      transfer: {
        from: "0x00000000000000000000000000000000000000aa",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: false,
      },
      postTransferAccess: [],
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: true,
      },
    });

    expect(mocks.runRegisterWhisperBlockWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      voiceHash,
      structuredFingerprintData: "0x1234",
      generateEncryptionKey: true,
      grant: undefined,
    });
    expect(result.summary.encryptionKeyGenerated).toBe(true);
  });

  it("runs transfer plus re-secure plus whisper grant", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
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

    const result = await runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
      voiceAsset: { voiceHash },
      transfer: {
        from: "0x00000000000000000000000000000000000000aa",
        to: "0x00000000000000000000000000000000000000bb",
        tokenId: "17",
        safe: false,
      },
      postTransferAccess: [],
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: true,
        grant: {
          user: "0x00000000000000000000000000000000000000dd",
          duration: "900",
        },
      },
    });

    expect(result.security?.accessGrant?.grant).toEqual({
      user: "0x00000000000000000000000000000000000000dd",
      duration: "900",
    });
    expect(result.summary.whisperGrantUser).toBe("0x00000000000000000000000000000000000000dd");
  });

  it("propagates transfer failure", async () => {
    mocks.runTransferRightsWorkflow.mockRejectedValueOnce(new Error("transfer failed"));

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [],
      }),
    ).rejects.toThrow("transfer failed");
  });

  it("propagates authorization failure", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockRejectedValueOnce(new Error("authorization failed"));

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
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
      }),
    ).rejects.toThrow("authorization failed");
  });

  it("fails when role confirmation is missing after transfer", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: false,
      },
      authorizations: [],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000cc",
        expiryTime: "3600",
        requestedVoiceCount: 0,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
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
            authorizeVoice: false,
          },
        ],
      }),
    ).rejects.toThrow("role confirmation");
  });

  it("supports role-only post-transfer setup without per-voice authorization", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [],
      summary: {
        role,
        account: "0x00000000000000000000000000000000000000cc",
        expiryTime: "3600",
        requestedVoiceCount: 0,
        authorizedVoiceCount: 0,
      },
    });

    const result = await runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
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
          authorizeVoice: false,
        },
      ],
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      role,
      account: "0x00000000000000000000000000000000000000cc",
      expiryTime: "3600",
      voiceHashes: [],
    });
    expect(result.postTransferAccess.summary.voiceAuthorizationCount).toBe(0);
  });

  it("propagates security failure", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockRejectedValueOnce(new Error("security failed"));

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("security failed");
  });

  it("fails when whisper authenticity verification is missing", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        submission: { txHash: "0xfingerprint" },
        txHash: "0xfingerprint",
        authenticityVerified: false,
        eventCount: 0,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash,
        generateEncryptionKey: false,
        grantedUser: null,
        grantedDuration: null,
      },
    });

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("verified fingerprint");
  });

  it("fails when encryption was requested but not completed", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        submission: { txHash: "0xfingerprint" },
        txHash: "0xfingerprint",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash,
        generateEncryptionKey: true,
        grantedUser: null,
        grantedDuration: null,
      },
    });

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: true,
        },
      }),
    ).rejects.toThrow("encryption key step");
  });

  it("fails when whisper grant was requested but not completed", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        submission: { txHash: "0xfingerprint" },
        txHash: "0xfingerprint",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash,
        generateEncryptionKey: false,
        grantedUser: null,
        grantedDuration: null,
      },
    });

    await expect(
      runTransferAndResecureVoiceAssetWorkflow(context, auth, undefined, {
        voiceAsset: { voiceHash },
        transfer: {
          from: "0x00000000000000000000000000000000000000aa",
          to: "0x00000000000000000000000000000000000000bb",
          tokenId: "17",
          safe: false,
        },
        postTransferAccess: [],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
          grant: {
            user: "0x00000000000000000000000000000000000000dd",
            duration: "900",
          },
        },
      }),
    ).rejects.toThrow("whisper access grant");
  });
});
