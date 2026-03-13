import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runRegisterVoiceAssetWorkflow: vi.fn(),
  runOnboardRightsHolderWorkflow: vi.fn(),
  runRegisterWhisperBlockWorkflow: vi.fn(),
}));

vi.mock("../modules/voice-assets/index.js", () => ({
  runRegisterVoiceAssetWorkflow: mocks.runRegisterVoiceAssetWorkflow,
}));

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

import { runOnboardVoiceAssetWorkflow } from "./onboard-voice-asset.js";

describe("runOnboardVoiceAssetWorkflow", () => {
  const context = {} as never;
  const auth = {
    apiKey: "test-key",
    label: "test",
    roles: ["service"],
    allowGasless: false,
  };
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
        expiryTime: "100",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 1,
      },
    });
  });

  it("runs the minimal onboarding path", async () => {
    const result = await runOnboardVoiceAssetWorkflow(context, auth, undefined, {
      asset: {
        ipfsHash: "ipfs://voice",
        royaltyRate: "100",
      },
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: false,
      },
    });

    expect(mocks.runRegisterVoiceAssetWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      ipfsHash: "ipfs://voice",
      royaltyRate: "100",
    });
    expect(mocks.runOnboardRightsHolderWorkflow).not.toHaveBeenCalled();
    expect(mocks.runRegisterWhisperBlockWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      voiceHash,
      structuredFingerprintData: "0x1234",
      generateEncryptionKey: false,
      grant: undefined,
    });
    expect(result).toEqual({
      asset: expect.any(Object),
      accessSetup: null,
      security: expect.any(Object),
      summary: {
        voiceHash,
        assetOwner: null,
        grantedAccessActorCount: 0,
        encryptionKeyGenerated: false,
        whisperGrantUser: null,
      },
    });
  });

  it("runs onboarding with access grantees", async () => {
    const result = await runOnboardVoiceAssetWorkflow(context, auth, undefined, {
      asset: {
        ipfsHash: "ipfs://voice",
        royaltyRate: "100",
      },
      accessSetup: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        expiryTime: "3600",
        grantees: [
          "0x00000000000000000000000000000000000000bb",
          "0x00000000000000000000000000000000000000cc",
        ],
      },
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: false,
      },
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledTimes(2);
    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenNthCalledWith(1, context, auth, undefined, {
      role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      account: "0x00000000000000000000000000000000000000bb",
      expiryTime: "3600",
      voiceHashes: [voiceHash],
    });
    expect(result.accessSetup?.summary).toEqual({
      requestedGranteeCount: 2,
      completedGranteeCount: 2,
    });
    expect(result.summary.grantedAccessActorCount).toBe(2);
  });

  it("runs onboarding with encryption key generation", async () => {
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

    const result = await runOnboardVoiceAssetWorkflow(context, auth, undefined, {
      asset: {
        ipfsHash: "ipfs://voice",
        royaltyRate: "100",
      },
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: true,
      },
    });

    expect(result.security.encryptionKey).not.toBeNull();
    expect(result.summary.encryptionKeyGenerated).toBe(true);
  });

  it("runs onboarding with whisper access grant", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        submission: { txHash: "0xfingerprint" },
        txHash: "0xfingerprint",
        authenticityVerified: true,
        eventCount: 1,
      },
      encryptionKey: null,
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
        generateEncryptionKey: false,
        grantedUser: "0x00000000000000000000000000000000000000dd",
        grantedDuration: "900",
      },
    });

    const result = await runOnboardVoiceAssetWorkflow(context, auth, undefined, {
      asset: {
        ipfsHash: "ipfs://voice",
        royaltyRate: "100",
      },
      security: {
        structuredFingerprintData: "0x1234",
        generateEncryptionKey: false,
        grant: {
          user: "0x00000000000000000000000000000000000000dd",
          duration: "900",
        },
      },
    });

    expect(result.security.accessGrant?.grant).toEqual({
      user: "0x00000000000000000000000000000000000000dd",
      duration: "900",
    });
    expect(result.summary.whisperGrantUser).toBe("0x00000000000000000000000000000000000000dd");
  });

  it("propagates asset workflow failure", async () => {
    mocks.runRegisterVoiceAssetWorkflow.mockRejectedValueOnce(new Error("asset timeout"));

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("asset timeout");
  });

  it("propagates access workflow failure", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockRejectedValueOnce(new Error("access timeout"));

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
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
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("access timeout");
  });

  it("propagates security workflow failure", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockRejectedValueOnce(new Error("security timeout"));

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("security timeout");
  });

  it("fails when asset registration does not return voiceHash", async () => {
    mocks.runRegisterVoiceAssetWorkflow.mockResolvedValueOnce({
      registration: {
        submission: { txHash: "0xasset" },
        txHash: "0xasset",
        voiceAsset: { owner: "0x00000000000000000000000000000000000000aa" },
      },
      metadataUpdate: null,
      voiceHash: null,
      summary: { owner: null, hasFeatures: false },
    });

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("voiceHash");
  });

  it("fails when asset registration lacks confirmed readback", async () => {
    mocks.runRegisterVoiceAssetWorkflow.mockResolvedValueOnce({
      registration: {
        submission: { txHash: "0xasset" },
        txHash: "0xasset",
        voiceAsset: null,
      },
      metadataUpdate: null,
      voiceHash,
      summary: { owner: null, hasFeatures: false },
    });

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("confirmed asset registration readback");
  });

  it("fails when access role confirmation is missing", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        submission: { txHash: "0xrole" },
        txHash: "0xrole",
        hasRole: false,
      },
      authorizations: [],
      summary: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
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
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("role confirmation");
  });

  it("fails when authorization confirmation is missing", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
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
          isAuthorized: false,
        },
      ],
      summary: {
        role: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        account: "0x00000000000000000000000000000000000000bb",
        expiryTime: "3600",
        requestedVoiceCount: 1,
        authorizedVoiceCount: 0,
      },
    });

    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
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
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("authorization confirmation");
  });

  it("fails when fingerprint verification is missing", async () => {
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
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
        },
      }),
    ).rejects.toThrow("verified fingerprint");
  });

  it("fails when expected encryption key output is missing", async () => {
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
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: true,
        },
      }),
    ).rejects.toThrow("expected encryption key");
  });

  it("fails when expected whisper grant output is missing", async () => {
    await expect(
      runOnboardVoiceAssetWorkflow(context, auth, undefined, {
        asset: {
          ipfsHash: "ipfs://voice",
          royaltyRate: "100",
        },
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: false,
          grant: {
            user: "0x00000000000000000000000000000000000000dd",
            duration: "900",
          },
        },
      }),
    ).rejects.toThrow("expected whisper access grant");
  });
});
