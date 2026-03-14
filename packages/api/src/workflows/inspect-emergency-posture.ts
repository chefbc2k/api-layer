import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createEmergencyPrimitiveService } from "../modules/emergency/primitives/generated/index.js";
import {
  addressSchema,
  bytes32Schema,
  digitsSchema,
  mapEmergencyStateLabel,
  normalizeRequestId,
  readEmergencyPosture,
  readIncidentSummary,
  readRecoveryPlanSummary,
  readScalarBody,
} from "./emergency-helpers.js";

export const inspectEmergencyPostureWorkflowSchema = z.object({
  incidentId: digitsSchema.optional(),
  assetIds: z.array(digitsSchema).min(1).optional(),
  withdrawal: z.object({
    requestId: bytes32Schema.optional(),
    recipient: addressSchema.optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.withdrawal && !value.withdrawal.requestId && !value.withdrawal.recipient) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["withdrawal"],
      message: "inspect-emergency-posture withdrawal expected requestId or recipient",
    });
  }
});

export async function runInspectEmergencyPostureWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof inspectEmergencyPostureWorkflowSchema>,
) {
  const emergency = createEmergencyPrimitiveService(context);
  const posture = await readEmergencyPosture(emergency, auth, walletAddress);

  const incident = body.incidentId
    ? await emergency.getIncident({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.incidentId],
    })
    : null;
  const incidentRead = incident ? readIncidentSummary(incident.body) : null;

  const recovery = body.incidentId
    ? await emergency.getRecoveryPlan({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.incidentId],
    })
    : null;
  const recoveryRead = recovery ? readRecoveryPlanSummary(recovery.body) : null;

  const assets = body.assetIds
    ? await Promise.all(body.assetIds.map(async (assetId) => {
      const frozen = await emergency.isAssetFrozen({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [assetId],
      });
      return {
        assetId,
        frozen: frozen.body === true,
      };
    }))
    : [];

  const withdrawal = body.withdrawal
    ? {
      requestId: body.withdrawal.requestId ?? null,
      approvalCount: body.withdrawal.requestId
        ? readScalarBody((await emergency.getApprovalCount({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [body.withdrawal.requestId],
        })).body)
        : null,
      recipient: body.withdrawal.recipient ?? null,
      recipientWhitelisted: body.withdrawal.recipient
        ? (await emergency.isRecipientWhitelisted({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [body.withdrawal.recipient],
        })).body === true
        : null,
      instantRequest: normalizeRequestId(body.withdrawal.requestId) === `0x${"0".repeat(64)}`,
    }
    : null;

  return {
    posture,
    incident: incidentRead,
    recovery: recoveryRead,
    assets,
    withdrawal,
    summary: {
      currentState: posture.currentState,
      currentStateLabel: mapEmergencyStateLabel(posture.currentState),
      emergencyStopped: posture.isEmergencyStopped,
      incidentId: incidentRead?.id ?? null,
      incidentResolved: incidentRead?.resolved ?? null,
      recoveryPhase: recoveryRead?.phase ?? null,
      frozenAssetCount: assets.filter((entry) => entry.frozen).length,
      withdrawalRequestTracked: Boolean(withdrawal?.requestId),
      recipientWhitelisted: withdrawal?.recipientWhitelisted ?? null,
    },
  };
}
