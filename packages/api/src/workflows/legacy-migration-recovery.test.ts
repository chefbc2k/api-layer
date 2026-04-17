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

import {
  legacyMigrationRecoveryWorkflowSchema,
  runLegacyMigrationRecoveryWorkflow,
} from "./legacy-migration-recovery.js";

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

  it("rejects schema combinations that require a normalization voice hash", () => {
    const missingExecutionVoiceHash = legacyMigrationRecoveryWorkflowSchema.safeParse({
      legacy: {
        execution: {
          proofDocuments: ["proof-of-death.pdf"],
          approverActors: [{ apiKey: "approver-key" }],
        },
      },
    });
    expect(missingExecutionVoiceHash.success).toBe(false);
    expect(missingExecutionVoiceHash.error?.issues.map((issue) => issue.message)).toEqual([
      "legacy-migration-recovery requires voiceHash when proofDocuments are provided",
      "legacy-migration-recovery requires voiceHash when approverActors are provided",
    ]);

    const missingNormalizationVoiceHash = legacyMigrationRecoveryWorkflowSchema.safeParse({
      legacy: {},
      normalization: {
        accessSetup: [
          {
            role,
            account: "0x00000000000000000000000000000000000000ee",
            expiryTime: "3600",
            authorizeVoice: false,
          },
        ],
        security: {
          structuredFingerprintData: "0x1234",
        },
      },
    });
    expect(missingNormalizationVoiceHash.success).toBe(false);
    expect(missingNormalizationVoiceHash.error?.issues.map((issue) => issue.message)).toEqual([
      "legacy-migration-recovery requires voiceHash for post-migration access normalization",
      "legacy-migration-recovery requires voiceHash for post-migration security normalization",
    ]);
  });

  it("propagates failed post-migration authorization confirmation when voice authorization is requested", async () => {
    mocks.runOnboardRightsHolderWorkflow.mockResolvedValueOnce({
      roleGrant: {
        txHash: "0xrole",
        hasRole: true,
      },
      authorizations: [
        {
          voiceHash,
          txHash: "0xauth",
          isAuthorized: false,
        },
      ],
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
            authorizeVoice: true,
          },
        ],
      },
    })).rejects.toThrow("legacy-migration-recovery failed post-migration authorization confirmation");
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

  it("rejects mismatched security voice hash summaries", async () => {
    mocks.runRegisterWhisperBlockWorkflow.mockResolvedValueOnce({
      fingerprint: {
        txHash: "0xfingerprint",
        authenticityVerified: true,
      },
      encryptionKey: null,
      accessGrant: null,
      summary: {
        voiceHash: `0x${"2".repeat(64)}`,
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
    })).rejects.toThrow("legacy-migration-recovery security summary voiceHash mismatch");
  });

  it("supports normalization-only recovery with explicit owner and collaborator access without voice authorization", async () => {
    const service = {
      getLegacyPlan: vi.fn().mockResolvedValue({
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
      }),
      isInheritanceReady: vi.fn(),
      createLegacyPlan: vi.fn(),
      addVoiceAssets: vi.fn(),
      addDatasets: vi.fn(),
      addInheritanceRequirement: vi.fn(),
      validateBeneficiary: vi.fn(),
      addBeneficiary: vi.fn(),
      setBeneficiaryRelationship: vi.fn(),
      setInheritanceConditions: vi.fn(),
      initiateInheritance: vi.fn(),
      approveInheritance: vi.fn(),
      executeInheritance: vi.fn(),
      delegateRights: vi.fn(),
      getTokenId: vi.fn().mockResolvedValue({ statusCode: 200, body: 77n }),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          owner: "0x00000000000000000000000000000000000000aa",
        },
      }),
      legacyPlanCreatedEventQuery: vi.fn(),
      inheritanceConditionsUpdatedEventQuery: vi.fn(),
      inheritanceApprovedEventQuery: vi.fn(),
      inheritanceActivatedEventQuery: vi.fn(),
      rightsDelegatedEventQuery: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValueOnce(service);

    const result = await runLegacyMigrationRecoveryWorkflow(context, auth, undefined, {
      legacy: {
        owner: "0x00000000000000000000000000000000000000aa",
      },
      normalization: {
        voiceHash,
        accessSetup: [
          {
            role,
            account: "0x00000000000000000000000000000000000000ee",
            expiryTime: "3600",
            authorizeVoice: false,
          },
        ],
      },
    });

    expect(mocks.runOnboardRightsHolderWorkflow).toHaveBeenCalledWith(context, auth, undefined, {
      role,
      account: "0x00000000000000000000000000000000000000ee",
      expiryTime: "3600",
      voiceHashes: [],
    });
    expect(mocks.runRegisterWhisperBlockWorkflow).not.toHaveBeenCalled();
    expect(result.legacy.planLifecycle).toEqual({
      createPlan: null,
      voiceAssets: [],
      datasets: null,
      inheritanceRequirements: [],
      beneficiaries: [],
      conditions: null,
      afterPlan: null,
    });
    expect(result.legacy.migration).toEqual({
      initiation: null,
      approvals: [],
      readinessBeforeExecute: null,
      execution: null,
      delegation: null,
      readinessAfter: null,
    });
    expect(result.normalization).toEqual({
      voiceHash,
      accessSetup: [
        {
          role,
          account: "0x00000000000000000000000000000000000000ee",
          authorizeVoice: false,
          result: expect.objectContaining({
            roleGrant: expect.objectContaining({ hasRole: true }),
          }),
        },
      ],
      security: null,
      custody: expect.objectContaining({
        tokenId: "77",
        owner: "0x00000000000000000000000000000000000000aa",
      }),
    });
    expect(result.summary).toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      normalizationVoiceHash: voiceHash,
      beneficiaryCount: 0,
      voiceAssetCountAdded: 0,
      datasetCountAdded: 0,
      inheritanceApprovalCount: 0,
      inheritanceExecuted: false,
      delegationApplied: false,
      normalizationApplied: true,
      custodyOwner: "0x00000000000000000000000000000000000000aa",
    });
  });

  it("handles tx-hashless plan and migration writes while falling back approver wallet addresses", async () => {
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
            memo: "lightweight plan",
            voiceAssets: [],
            datasetIds: [],
            beneficiaries: [{ account: "0x00000000000000000000000000000000000000bb" }],
            conditions: {
              requiresProof: false,
              minApprovals: "1",
            },
            isActive: true,
            isExecuted: false,
          },
        }),
      isInheritanceReady: vi.fn()
        .mockResolvedValueOnce({ statusCode: 200, body: { result: false } })
        .mockResolvedValueOnce({ statusCode: 200, body: { result: false } }),
      createLegacyPlan: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      addVoiceAssets: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      addDatasets: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      addInheritanceRequirement: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      validateBeneficiary: vi.fn().mockResolvedValue({ statusCode: 200, body: true }),
      addBeneficiary: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      setBeneficiaryRelationship: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      setInheritanceConditions: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      initiateInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      approveInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      executeInheritance: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      delegateRights: vi.fn().mockResolvedValue({ statusCode: 202, body: { accepted: true } }),
      getTokenId: vi.fn().mockResolvedValue({ statusCode: 200, body: "77" }),
      getVoiceAsset: vi.fn().mockResolvedValue({
        statusCode: 200,
        body: {
          owner: "0x00000000000000000000000000000000000000aa",
        },
      }),
      legacyPlanCreatedEventQuery: vi.fn(),
      inheritanceConditionsUpdatedEventQuery: vi.fn(),
      inheritanceApprovedEventQuery: vi.fn(),
      inheritanceActivatedEventQuery: vi.fn(),
      rightsDelegatedEventQuery: vi.fn(),
    };
    mocks.createVoiceAssetsPrimitiveService.mockReturnValueOnce(service);

    const result = await runLegacyMigrationRecoveryWorkflow(context, auth, "0x00000000000000000000000000000000000000aa", {
      legacy: {
        plan: {
          memo: "lightweight plan",
          beneficiaries: [
            {
              account: "0x00000000000000000000000000000000000000bb",
              share: "10000",
              canDelegate: false,
            },
          ],
          conditions: {
            timelock: "0",
            requiresProof: false,
            approvers: ["0x00000000000000000000000000000000000000cc"],
            minApprovals: "1",
          },
        },
        execution: {
          voiceHash,
          proofDocuments: ["proof-of-death.pdf"],
          approverActors: [{ apiKey: "approver-key" }],
          execute: true,
          delegateRights: {
            delegatee: "0x00000000000000000000000000000000000000ff",
            duration: "3600",
          },
        },
      },
    });

    expect(service.approveInheritance).toHaveBeenCalledWith(expect.objectContaining({
      auth: approverAuth,
      walletAddress: "0x00000000000000000000000000000000000000aa",
      wireParams: [voiceHash],
    }));
    expect(result.legacy.planLifecycle.createPlan).toEqual({
      submission: { accepted: true },
      txHash: null,
      eventCount: 0,
    });
    expect(result.legacy.planLifecycle.beneficiaries).toEqual([
      {
        account: "0x00000000000000000000000000000000000000bb",
        add: {
          submission: { accepted: true },
          txHash: null,
        },
        relationship: null,
      },
    ]);
    expect(result.legacy.planLifecycle.conditions).toEqual({
      submission: { accepted: true },
      txHash: null,
      eventCount: 0,
    });
    expect(result.legacy.migration).toEqual({
      initiation: {
        submission: { accepted: true },
        txHash: null,
      },
      approvals: [
        {
          actor: "0x00000000000000000000000000000000000000aa",
          submission: { accepted: true },
          txHash: null,
          eventCount: 0,
        },
      ],
      readinessBeforeExecute: { result: false },
      execution: {
        submission: { accepted: true },
        txHash: null,
        eventCount: 0,
      },
      delegation: {
        submission: { accepted: true },
        txHash: null,
        eventCount: 0,
        delegatee: "0x00000000000000000000000000000000000000ff",
        duration: "3600",
      },
      readinessAfter: { result: false },
    });
    expect(result.normalization).toEqual({
      voiceHash,
      accessSetup: [],
      security: null,
      custody: {
        tokenId: "77",
        owner: "0x00000000000000000000000000000000000000aa",
        voiceAsset: { owner: "0x00000000000000000000000000000000000000aa" },
      },
    });
    expect(result.summary).toEqual({
      owner: "0x00000000000000000000000000000000000000aa",
      normalizationVoiceHash: voiceHash,
      beneficiaryCount: 1,
      voiceAssetCountAdded: 0,
      datasetCountAdded: 0,
      inheritanceApprovalCount: 1,
      inheritanceExecuted: true,
      delegationApplied: true,
      normalizationApplied: false,
      custodyOwner: "0x00000000000000000000000000000000000000aa",
    });
  });
});
