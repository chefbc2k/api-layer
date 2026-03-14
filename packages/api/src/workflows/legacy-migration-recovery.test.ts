import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../shared/errors.js";

const mocks = vi.hoisted(() => ({
  createVoiceAssetsPrimitiveService: vi.fn(),
  runOnboardRightsHolderWorkflow: vi.fn(),
  runRegisterWhisperBlockWorkflow: vi.fn(),
}));

vi.mock("../modules/voice-assets/primitives/generated/index.js", () => ({
  createVoiceAssetsPrimitiveService: mocks.createVoiceAssetsPrimitiveService,
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

import { runLegacyMigrationRecoveryWorkflow } from "./legacy-migration-recovery.js";

describe("runLegacyMigrationRecoveryWorkflow", () => {
  const auth = {
    apiKey: "legacy-owner-key",
    label: "legacy-owner",
    roles: ["service"],
    allowGasless: false,
  };
  const approverAuth = {
    apiKey: "approver-key",
    label: "approver",
    roles: ["service"],
    allowGasless: false,
  };
  const role = `0x${"a".repeat(64)}`;
  const voiceHash = `0x${"1".repeat(64)}`;
  const provider = {
    getTransactionReceipt: vi.fn().mockResolvedValue({
      blockNumber: 123n,
      status: 1n,
    }),
  };
  const context = {
    apiKeys: {
      "legacy-owner-key": auth,
      "approver-key": approverAuth,
    },
    providerRouter: {
      withProvider: vi.fn(async (_mode: string, _label: string, run: (provider: typeof provider) => Promise<unknown>) => run(provider)),
    },
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();

    const service = {
      getLegacyPlan: vi.fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            memo: "",
            voiceAssets: [],
            datasetIds: [],
            beneficiaries: [],
            conditions: {},
            isActive: false,
            isExecuted: false,
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            memo: "migration plan",
            voiceAssets: [voiceHash],
            datasetIds: ["17"],
            beneficiaries: [{ account: "0x00000000000000000000000000000000000000bb" }],
            conditions: {
              requiresProof: true,
              minApprovals: "1",
            },
            isActive: true,
            isExecuted: false,
          },
        }),
      isInheritanceReady: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { result: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { result: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { result: true } })
        .mockResolvedValueOnce({ statusCode: 200, body: { result: false } }),
      createLegacyPlan: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xcreate-plan" } }),
      addVoiceAssets: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xadd-voice" } }),
      addDatasets: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xadd-dataset" } }),
      addInheritanceRequirement: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xadd-doc" } }),
      validateBeneficiary: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      addBeneficiary: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xadd-beneficiary" } }),
      setBeneficiaryRelationship: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xrelationship" } }),
      setInheritanceConditions: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xconditions" } }),
      initiateInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xinitiate" } }),
      approveInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xapprove" } }),
      executeInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xexecute" } }),
      delegateRights: vi.fn().mockResolvedValue({ statusCode: 202, body: { txHash: "0xdelegate" } }),
      getTokenId: vi.fn().mockResolvedValue({ statusCode: 200, body: "77" }),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          owner: "0x00000000000000000000000000000000000000DD",
        },
      }),
      legacyPlanCreatedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xcreate-plan" }] }),
      inheritanceConditionsUpdatedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xconditions" }] }),
      inheritanceApprovedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xapprove" }] }),
      inheritanceActivatedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xexecute" }] }),
      rightsDelegatedEventQuery: vi.fn().mockResolvedValue({ statusCode: 200, body: [{ transactionHash: "0xdelegate" }] }),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValue(service);

    mocks.runOnboardRightsHolderWorkflow.mockResolvedValue({
      roleGrant: {
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          txHash: "0xauth",
          isAuthorized: true,
        },
      ],
      summary: {
        account: "0x00000000000000000000000000000000000000ee",
      },
    });

    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValue({
      fingerprint: {
        txHash: "0xfingerprint",
        authenticityVerified: true,
      },
      encryptionKey: {
        txHash: "0xkey",
      },
      accessGrant: null,
      summary: {
        voiceHash,
      },
    });
  });

  it("runs the plan, migration, and normalization path", async () => {
    const result = await runLegacyMigrationRecoveryWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      legacy: {
        plan: {
          memo: "migration plan",
          voiceAssets: [voiceHash],
          datasetIds: ["17"],
          inheritanceRequirements: ["proof-of-death.pdf"],
          beneficiaries: [
            {
              account: "0x00000000000000000000000000000000000000bb",
              share: "10000",
              canDelegate: true,
              relationship: "beneficiary",
            },
          ],
          conditions: {
            timelock: "86400",
            requiresProof: true,
            approvers: ["0x00000000000000000000000000000000000000cc"],
            minApprovals: "1",
          },
        },
        execution: {
          voiceHash,
          proofDocuments: ["proof-of-death.pdf"],
          approverActors: [
            {
              apiKey: "approver-key",
              walletAddress: "0x00000000000000000000000000000000000000cc",
            },
          ],
          execute: true,
          delegateRights: {
            delegatee: "0x00000000000000000000000000000000000000ff",
            duration: "3600",
          },
        },
      },
      normalization: {
        accessSetup: [
          {
            role,
            account: "0x00000000000000000000000000000000000000ee",
            expiryTime: "3600",
            authorizeVoice: true,
          },
        ],
        security: {
          structuredFingerprintData: "0x1234",
          generateEncryptionKey: true,
        },
      },
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, "0x00000000000000000000000000000000000000aa", {
      role,
      account: "0x00000000000000000000000000000000000000ee",
      expiryTime: "3600",
      voiceHashes: [voiceHash],
    });
    expect(mocks.runRegisterWhisperBlockWorkflow).toHaveBeenCalledWith(context, auth, "0x00000000000000000000000000000000000000aa", {
      voiceHash,
      structuredFingerprintData: "0x1234",
      generateEncryptionKey: true,
      grant: undefined,
    });
    expect(result.summary).toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      normalizationVoiceHash: voiceHash,
      beneficiaryCount: 1,
      voiceAssetCountAdded: 1,
      datasetCountAdded: 1,
      inheritanceApprovalCount: 1,
      inheritanceExecuted: true,
      delegationApplied: true,
      normalizationApplied: true,
      custodyOwner: "0x00000000000000000000000000000000000000dd",
    });
    expect(result.legacy.migration.execution?.eventCount).toBe(1);
    expect(result.normalization.custody).toEqual(expect.objectContaining({
      tokenId: "77",
      owner: "0x00000000000000000000000000000000000000dd",
    }));
  });

  it("rejects unknown approver actor overrides", async () => {
    await expect(runLegacyMigrationRecoveryWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      legacy: {
        execution: {
          voiceHash,
          approverActors: [{ apiKey: "missing-actor" }],
        },
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: "legacy-migration-recovery received unknown approver actor apiKey",
    } satisfies Partial<HttpError>);
  });

  it("propagates failed post-migration authorization confirmation", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        txHash: "0xrole",
        hasRole: false,
      },
      authorizations: [],
      summary: {},
    });

    await expect(runLegacyMigrationRecoveryWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      legacy: {
        execution: {
          voiceHash,
        },
      },
      normalization: {
        accessSetup: [
          {
            role,
            account: "0x00000000000000000000000000000000000000ee",
            expiryTime: "3600",
            authorizeVoice: false,
          },
        ],
      },
    })).rejects.toThrow("legacy-migration-recovery failed role confirmation");
  });

  it("propagates failed post-migration security confirmation", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        txHash: "0xfingerprint",
        authenticityVerified: false,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash,
      },
    });

    await expect(runLegacyMigrationRecoveryWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      legacy: {
        execution: {
          voiceHash,
        },
      },
      normalization: {
        security: {
          structuredFingerprintData: "0x1234",
        },
      },
    })).rejects.toThrow("legacy-migration-recovery requires verified fingerprint registration");
  });
});
