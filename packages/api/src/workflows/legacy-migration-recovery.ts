import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import { runOnboardRightsHolderWorkflow } from "./onboard-rights-holder.js";
import { registerWhisperBlockSchema, runRegisterWhisperBlockWorkflow } from "./register-whisper-block.js";
import {
  asRecord,
  hasTransactionHash,
  normalizeAddress,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { runInspectLegacyMigrationPostureWorkflow } from "./inspect-legacy-migration-posture.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);
const digitsSchema = z.string().regex(/^\d+$/u);

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

const beneficiarySetupSchema = z.object({
  account: addressSchema,
  share: digitsSchema,
  canDelegate: z.boolean(),
  relationship: z.string().min(1).optional(),
});

const collaboratorSetupSchema = z.object({
  role: bytes32Schema,
  account: addressSchema,
  expiryTime: digitsSchema,
  authorizeVoice: z.boolean().default(true),
});

export const legacyMigrationRecoveryWorkflowSchema = z.object({
  legacy: z.object({
    owner: addressSchema.optional(),
    plan: z.object({
      memo: z.string().min(1).optional(),
      voiceAssets: z.array(bytes32Schema).optional(),
      datasetIds: z.array(digitsSchema).optional(),
      inheritanceRequirements: z.array(z.string().min(1)).optional(),
      beneficiaries: z.array(beneficiarySetupSchema).optional(),
      conditions: z.object({
        timelock: digitsSchema,
        requiresProof: z.boolean(),
        approvers: z.array(addressSchema),
        minApprovals: digitsSchema,
      }).optional(),
    }).optional(),
    execution: z.object({
      voiceHash: bytes32Schema.optional(),
      proofDocuments: z.array(z.string().min(1)).optional(),
      approverActors: z.array(actorOverrideSchema).optional(),
      execute: z.boolean().optional(),
      delegateRights: z.object({
        delegatee: addressSchema,
        duration: digitsSchema,
      }).optional(),
    }).optional(),
  }),
  normalization: z.object({
    voiceHash: bytes32Schema.optional(),
    accessSetup: z.array(collaboratorSetupSchema).default([]),
    security: registerWhisperBlockSchema.omit({ voiceHash: true }).optional(),
  }).optional(),
}).superRefine((body, ctx) => {
  const voiceHash = body.legacy.execution?.voiceHash ?? body.normalization?.voiceHash;
  if (body.legacy.execution?.proofDocuments && !body.legacy.execution.voiceHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["legacy", "execution", "voiceHash"],
      message: "legacy-migration-recovery requires voiceHash when proofDocuments are provided",
    });
  }
  if (body.legacy.execution?.approverActors && !body.legacy.execution.voiceHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["legacy", "execution", "voiceHash"],
      message: "legacy-migration-recovery requires voiceHash when approverActors are provided",
    });
  }
  if ((body.normalization?.accessSetup.length ?? 0) > 0 && !voiceHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["normalization", "voiceHash"],
      message: "legacy-migration-recovery requires voiceHash for post-migration access normalization",
    });
  }
  if (body.normalization?.security && !voiceHash) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["normalization", "voiceHash"],
      message: "legacy-migration-recovery requires voiceHash for post-migration security normalization",
    });
  }
});

export async function runLegacyMigrationRecoveryWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof legacyMigrationRecoveryWorkflowSchema>,
) {
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const owner = body.legacy.owner ?? await resolveWorkflowAccountAddress(context, auth, walletAddress, "legacyMigrationRecovery.owner");
  const normalizationVoiceHash = body.normalization?.voiceHash ?? body.legacy.execution?.voiceHash ?? null;

  const before = await runInspectLegacyMigrationPostureWorkflow(context, auth, walletAddress, {
    owner,
    voiceHash: body.legacy.execution?.voiceHash,
  });

  let createPlan: { submission: unknown, txHash: string | null, eventCount: number } | null = null;
  if (body.legacy.plan?.memo) {
    const write = await voiceAssets.createLegacyPlan({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.legacy.plan.memo],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.createLegacyPlan");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "legacyMigrationRecovery.createLegacyPlan") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
        () => voiceAssets.legacyPlanCreatedEventQuery({
          auth,
          fromBlock: BigInt(receipt.blockNumber),
          toBlock: BigInt(receipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, txHash),
        "legacyMigrationRecovery.legacyPlanCreated",
      )
      : [];
    createPlan = {
      submission: write.body,
      txHash,
      eventCount: events.length,
    };
  }

  const voiceAssetAdds = await Promise.all((body.legacy.plan?.voiceAssets ?? []).map(async (voiceHash) => {
    const write = await voiceAssets.addVoiceAssets({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [[voiceHash]],
    });
    return {
      voiceHash,
      submission: write.body,
      txHash: await waitForWorkflowWriteReceipt(context, write.body, `legacyMigrationRecovery.addVoiceAssets.${voiceHash}`),
    };
  }));

  const datasetAdds = (body.legacy.plan?.datasetIds?.length ?? 0) > 0
    ? await (async () => {
      const write = await voiceAssets.addDatasets({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.legacy.plan!.datasetIds!],
      });
      return {
        datasetIds: body.legacy.plan!.datasetIds!,
        submission: write.body,
        txHash: await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.addDatasets"),
      };
    })()
    : null;

  const requirementAdds = await Promise.all((body.legacy.plan?.inheritanceRequirements ?? []).map(async (doc) => {
    const write = await voiceAssets.addInheritanceRequirement({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [doc],
    });
    return {
      doc,
      submission: write.body,
      txHash: await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.addInheritanceRequirement"),
    };
  }));

  const beneficiaries = await Promise.all((body.legacy.plan?.beneficiaries ?? []).map(async (beneficiary) => {
    await voiceAssets.validateBeneficiary({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [{
        sharePercentage: beneficiary.share,
        activationTime: "0",
        account: beneficiary.account,
        isActive: true,
        canDelegate: beneficiary.canDelegate,
        relationship: beneficiary.relationship ?? "",
      }],
    });
    const add = await voiceAssets.addBeneficiary({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [beneficiary.account, beneficiary.share, beneficiary.canDelegate],
    });
    const addTxHash = await waitForWorkflowWriteReceipt(context, add.body, `legacyMigrationRecovery.addBeneficiary.${beneficiary.account}`);
    let relationship: { submission: unknown, txHash: string | null } | null = null;
    if (beneficiary.relationship) {
      const relationshipWrite = await voiceAssets.setBeneficiaryRelationship({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [beneficiary.account, beneficiary.relationship],
      });
      relationship = {
        submission: relationshipWrite.body,
        txHash: await waitForWorkflowWriteReceipt(context, relationshipWrite.body, `legacyMigrationRecovery.setBeneficiaryRelationship.${beneficiary.account}`),
      };
    }
    return {
      account: beneficiary.account,
      add: {
        submission: add.body,
        txHash: addTxHash,
      },
      relationship,
    };
  }));

  const conditions = body.legacy.plan?.conditions
    ? await (async () => {
      const write = await voiceAssets.setInheritanceConditions({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [
          body.legacy.plan!.conditions!.timelock,
          body.legacy.plan!.conditions!.requiresProof,
          body.legacy.plan!.conditions!.approvers,
          body.legacy.plan!.conditions!.minApprovals,
        ],
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.setInheritanceConditions");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "legacyMigrationRecovery.setInheritanceConditions") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
          () => voiceAssets.inheritanceConditionsUpdatedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "legacyMigrationRecovery.inheritanceConditionsUpdated",
        )
        : [];
      return {
        submission: write.body,
        txHash,
        eventCount: events.length,
      };
    })()
    : null;

  const afterPlan = body.legacy.plan
    ? await runInspectLegacyMigrationPostureWorkflow(context, auth, walletAddress, {
      owner,
      voiceHash: body.legacy.execution?.voiceHash,
    })
    : null;

  let initiation: { submission: unknown, txHash: string | null } | null = null;
  if (body.legacy.execution?.voiceHash && body.legacy.execution.proofDocuments) {
    const write = await voiceAssets.initiateInheritance({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.legacy.execution.voiceHash, body.legacy.execution.proofDocuments],
    });
    initiation = {
      submission: write.body,
      txHash: await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.initiateInheritance"),
    };
  }

  const approvalResults = await Promise.all((body.legacy.execution?.approverActors ?? []).map(async (actorOverride) => {
    const actor = resolveActorOverride(context, auth, walletAddress, actorOverride);
    const write = await voiceAssets.approveInheritance({
      auth: actor.auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [body.legacy.execution!.voiceHash!],
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.approveInheritance");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "legacyMigrationRecovery.approveInheritance") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
        () => voiceAssets.inheritanceApprovedEventQuery({
          auth: actor.auth,
          fromBlock: BigInt(receipt.blockNumber),
          toBlock: BigInt(receipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, txHash),
        "legacyMigrationRecovery.inheritanceApproved",
      )
      : [];
    return {
      actor: actor.walletAddress ?? null,
      submission: write.body,
      txHash,
      eventCount: events.length,
    };
  }));

  const readinessBeforeExecute = body.legacy.execution?.voiceHash
    ? await waitForWorkflowReadback(
      () => voiceAssets.isInheritanceReady({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.legacy.execution!.voiceHash!],
      }),
      (result) => result.statusCode === 200,
      "legacyMigrationRecovery.readinessBeforeExecute",
    )
    : null;

  const execution = body.legacy.execution?.execute
    ? await (async () => {
      const write = await voiceAssets.executeInheritance({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [owner],
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.executeInheritance");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "legacyMigrationRecovery.executeInheritance") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
          () => voiceAssets.inheritanceActivatedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "legacyMigrationRecovery.inheritanceActivated",
        )
        : [];
      return {
        submission: write.body,
        txHash,
        eventCount: events.length,
      };
    })()
    : null;

  const delegation = body.legacy.execution?.delegateRights
    ? await (async () => {
      const write = await voiceAssets.delegateRights({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.legacy.execution!.delegateRights!.delegatee, body.legacy.execution!.delegateRights!.duration],
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "legacyMigrationRecovery.delegateRights");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "legacyMigrationRecovery.delegateRights") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
          () => voiceAssets.rightsDelegatedEventQuery({
            auth,
            fromBlock: BigInt(receipt.blockNumber),
            toBlock: BigInt(receipt.blockNumber),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "legacyMigrationRecovery.rightsDelegated",
        )
        : [];
      return {
        submission: write.body,
        txHash,
        eventCount: events.length,
        delegatee: body.legacy.execution!.delegateRights!.delegatee,
        duration: body.legacy.execution!.delegateRights!.duration,
      };
    })()
    : null;

  const readinessAfter = body.legacy.execution?.voiceHash
    ? await waitForWorkflowReadback(
      () => voiceAssets.isInheritanceReady({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.legacy.execution!.voiceHash!],
      }),
      (result) => result.statusCode === 200,
      "legacyMigrationRecovery.readinessAfter",
    )
    : null;

  const collaborators = [];
  if (normalizationVoiceHash) {
    for (const entry of body.normalization?.accessSetup ?? []) {
      const result = await runOnboardRightsHolderWorkflow(context, auth, walletAddress, {
        role: entry.role,
        account: entry.account,
        expiryTime: entry.expiryTime,
        voiceHashes: entry.authorizeVoice ? [normalizationVoiceHash] : [],
      });
      if (result.roleGrant.hasRole !== true) {
        throw new Error(`legacy-migration-recovery failed role confirmation for ${entry.account}`);
      }
      if (entry.authorizeVoice && result.authorizations.some((authorization) => authorization.isAuthorized !== true)) {
        throw new Error(`legacy-migration-recovery failed post-migration authorization confirmation for ${entry.account}`);
      }
      collaborators.push({
        role: entry.role,
        account: entry.account,
        authorizeVoice: entry.authorizeVoice,
        result,
      });
    }
  }

  const security = body.normalization?.security && normalizationVoiceHash
    ? await runRegisterWhisperBlockWorkflow(context, auth, walletAddress, {
      voiceHash: normalizationVoiceHash,
      structuredFingerprintData: body.normalization.security.structuredFingerprintData,
      generateEncryptionKey: body.normalization.security.generateEncryptionKey,
      grant: body.normalization.security.grant,
    })
    : null;

  if (security) {
    if (security.fingerprint.authenticityVerified !== true) {
      throw new Error("legacy-migration-recovery requires verified fingerprint registration");
    }
    if (security.summary.voiceHash !== normalizationVoiceHash) {
      throw new Error("legacy-migration-recovery security summary voiceHash mismatch");
    }
  }

  const custody = normalizationVoiceHash
    ? await waitForWorkflowReadback(
      async () => {
        const tokenId = await voiceAssets.getTokenId({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [normalizationVoiceHash],
        });
        const voiceAsset = await voiceAssets.getVoiceAsset({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [normalizationVoiceHash],
        });
        const tokenIdValue = typeof tokenId.body === "string" || typeof tokenId.body === "number" || typeof tokenId.body === "bigint"
          ? String(tokenId.body)
          : null;
        return {
          statusCode: 200,
          body: {
            tokenId: tokenIdValue,
            owner: normalizeAddress(asRecord(voiceAsset.body)?.owner ?? null),
            voiceAsset: voiceAsset.body,
          },
        };
      },
      (result) => Boolean(asRecord(result.body)?.tokenId) && Boolean(asRecord(result.body)?.owner),
      "legacyMigrationRecovery.custody",
    )
    : null;

  return {
    legacy: {
      before,
      planLifecycle: {
        createPlan,
        voiceAssets: voiceAssetAdds,
        datasets: datasetAdds,
        inheritanceRequirements: requirementAdds,
        beneficiaries,
        conditions,
        afterPlan,
      },
      migration: {
        initiation,
        approvals: approvalResults,
        readinessBeforeExecute: readinessBeforeExecute?.body ?? null,
        execution,
        delegation,
        readinessAfter: readinessAfter?.body ?? null,
      },
    },
    normalization: {
      voiceHash: normalizationVoiceHash,
      accessSetup: collaborators,
      security,
      custody: custody?.body ?? null,
    },
    summary: {
      owner,
      normalizationVoiceHash,
      beneficiaryCount: beneficiaries.length,
      voiceAssetCountAdded: voiceAssetAdds.length,
      datasetCountAdded: body.legacy.plan?.datasetIds?.length ?? 0,
      inheritanceApprovalCount: approvalResults.length,
      inheritanceExecuted: Boolean(execution),
      delegationApplied: Boolean(delegation),
      normalizationApplied: collaborators.length > 0 || Boolean(security),
      custodyOwner: asRecord(custody?.body)?.owner ?? null,
    },
  };
}

function resolveActorOverride(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  actor: z.infer<typeof actorOverrideSchema>,
) {
  const childAuth = context.apiKeys[actor.apiKey];
  if (!childAuth) {
    throw new HttpError(400, "legacy-migration-recovery received unknown approver actor apiKey");
  }
  return {
    auth: childAuth,
    walletAddress: actor.walletAddress ?? walletAddress,
  };
}
