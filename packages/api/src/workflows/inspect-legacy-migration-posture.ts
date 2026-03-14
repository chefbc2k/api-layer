import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import {
  asRecord,
  resolveWorkflowAccountAddress,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const bytes32Schema = z.string().regex(/^0x[a-fA-F0-9]{64}$/u);

export const inspectLegacyMigrationPostureWorkflowSchema = z.object({
  owner: addressSchema.optional(),
  voiceHash: bytes32Schema.optional(),
});

export async function runInspectLegacyMigrationPostureWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof inspectLegacyMigrationPostureWorkflowSchema>,
) {
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const owner = body.owner ?? await resolveWorkflowAccountAddress(context, auth, walletAddress, "inspectLegacyMigrationPosture.owner");

  const planRead = await waitForWorkflowReadback(
    () => voiceAssets.getLegacyPlan({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [owner],
    }),
    (result) => result.statusCode === 200,
    "inspectLegacyMigrationPosture.getLegacyPlan",
  );

  const readiness = body.voiceHash
    ? await waitForWorkflowReadback(
      () => voiceAssets.isInheritanceReady({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.voiceHash!],
      }),
      (result) => result.statusCode === 200,
      "inspectLegacyMigrationPosture.isInheritanceReady",
    )
    : null;

  const plan = asRecord(planRead.body) ?? {};
  const beneficiaries = Array.isArray(plan.beneficiaries) ? plan.beneficiaries : [];
  const voiceAssetsInPlan = Array.isArray(plan.voiceAssets) ? plan.voiceAssets : [];
  const datasetIds = Array.isArray(plan.datasetIds) ? plan.datasetIds : [];
  const conditions = asRecord(plan.conditions);
  const inheritanceReady = readInheritanceReadyValue(readiness?.body);

  return {
    legacy: {
      owner,
      plan: planRead.body,
      readiness: readiness?.body ?? null,
      summary: {
        beneficiaryCount: beneficiaries.length,
        voiceAssetCount: voiceAssetsInPlan.length,
        datasetCount: datasetIds.length,
        requiresProof: conditions?.requiresProof ?? null,
        minApprovals: typeof conditions?.minApprovals === "string" || typeof conditions?.minApprovals === "number" || typeof conditions?.minApprovals === "bigint"
          ? String(conditions.minApprovals)
          : null,
        active: plan.isActive ?? null,
        executed: plan.isExecuted ?? null,
      },
    },
    summary: {
      owner,
      voiceHash: body.voiceHash ?? null,
      hasPlan: beneficiaries.length > 0 || voiceAssetsInPlan.length > 0 || datasetIds.length > 0 || Boolean(plan.memo),
      beneficiaryCount: beneficiaries.length,
      voiceAssetCount: voiceAssetsInPlan.length,
      inheritanceReady,
    },
  };
}

function readInheritanceReadyValue(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "boolean") {
    return value[0];
  }
  const record = asRecord(value);
  return typeof record?.result === "boolean" ? record.result : null;
}
