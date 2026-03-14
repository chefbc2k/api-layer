import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createEmergencyPrimitiveService } from "../modules/emergency/primitives/generated/index.js";
import {
  actorOverrideSchema,
  asRecord,
  buildEventWindow,
  digitsSchema,
  hasTransactionHash,
  normalizeEmergencyExecutionError,
  readEmergencyPosture,
  readIncidentSummary,
  readRecoveryPlanSummary,
  readWorkflowReceipt,
  resolveActorOverride,
  waitForEmergencyState,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./emergency-helpers.js";
import { runInspectEmergencyPostureWorkflow } from "./inspect-emergency-posture.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const resumeSchema = z.object({
  actor: actorOverrideSchema.optional(),
  mode: z.enum(["immediate", "schedule", "execute-scheduled"]),
  executeAfter: digitsSchema.optional(),
});

export const recoverFromEmergencyWorkflowSchema = z.object({
  incidentId: digitsSchema,
  start: z.object({
    actor: actorOverrideSchema.optional(),
    steps: z.array(z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/u)).min(1),
  }).optional(),
  approve: z.object({
    actor: actorOverrideSchema.optional(),
  }).optional(),
  execute: z.object({
    actor: actorOverrideSchema.optional(),
    stepIndices: z.array(digitsSchema).min(1),
  }).optional(),
  complete: z.object({
    actor: actorOverrideSchema.optional(),
  }).optional(),
  resume: resumeSchema.optional(),
}).superRefine((value, ctx) => {
  if (!value.start && !value.approve && !value.execute && !value.complete && !value.resume) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: "recover-from-emergency expected at least one recovery action",
    });
  }
  if (value.resume?.mode === "schedule" && !value.resume.executeAfter) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["resume", "executeAfter"],
      message: "recover-from-emergency schedule resume requires executeAfter",
    });
  }
});

export async function runRecoverFromEmergencyWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof recoverFromEmergencyWorkflowSchema>,
) {
  const emergency = createEmergencyPrimitiveService(context);
  const before = await runInspectEmergencyPostureWorkflow(context, auth, walletAddress, {
    incidentId: body.incidentId,
  });

  let recoveryRead = before.recovery;

  let start: {
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    recovery: NonNullable<typeof recoveryRead>,
  } | null = null;
  if (body.start) {
    const actor = resolveActorOverride(context, auth, walletAddress, body.start.actor, "recover-from-emergency", "start");
    const write = await emergency.startRecovery({
      auth: actor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [body.incidentId, body.start.steps],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "start-recovery");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.start");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "recoverFromEmergency.start") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => emergency.recoveryStartedEventQuery({
            auth: actor.auth,
            ...buildEventWindow(receipt),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "recoverFromEmergency.recoveryStarted",
        )
      : [];
    const readback = await waitForWorkflowReadback(
      () => emergency.getRecoveryPlan({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [body.incidentId],
      }),
      (result) => {
        const read = readRecoveryPlanSummary(result.body);
        return read.steps.length === body.start!.steps.length && read.startTime !== "0";
      },
      "recoverFromEmergency.startRead",
    );
    recoveryRead = readRecoveryPlanSummary(readback.body);
    start = {
      submission: write.body,
      txHash,
      eventCount: events.length,
      recovery: recoveryRead,
    };
  }

  let approval: {
    submission: unknown,
    txHash: string | null,
    recovery: NonNullable<typeof recoveryRead>,
  } | null = null;
  if (body.approve) {
    const actor = resolveActorOverride(context, auth, walletAddress, body.approve.actor, "recover-from-emergency", "approve");
    const approvalCountBefore = BigInt(recoveryRead?.approvalCount ?? "0");
    const write = await emergency.approveRecovery({
      auth: actor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [body.incidentId],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "approve-recovery");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.approve");
    const readback = await waitForWorkflowReadback(
      () => emergency.getRecoveryPlan({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [body.incidentId],
      }),
      (result) => {
        const read = readRecoveryPlanSummary(result.body);
        return BigInt(read.approvalCount ?? "0") > approvalCountBefore || read.approvedByGovernance === true;
      },
      "recoverFromEmergency.approveRead",
    );
    recoveryRead = readRecoveryPlanSummary(readback.body);
    approval = {
      submission: write.body,
      txHash,
      recovery: recoveryRead,
    };
  }

  const executedSteps: Array<{
    stepIndex: string,
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    recovery: NonNullable<typeof recoveryRead>,
  }> = [];
  if (body.execute) {
    const actor = resolveActorOverride(context, auth, walletAddress, body.execute.actor, "recover-from-emergency", "execute");
    for (const stepIndex of body.execute.stepIndices) {
      const resultCountBefore = recoveryRead?.results.length ?? 0;
      const write = await emergency.executeRecoveryStep({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [body.incidentId, stepIndex],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "recover-from-emergency", `execute-step-${stepIndex}`);
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, `recoverFromEmergency.execute.${stepIndex}`);
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, `recoverFromEmergency.execute.${stepIndex}`) : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.recoveryStepExecutedEventQuery({
              auth: actor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            `recoverFromEmergency.recoveryStepExecuted.${stepIndex}`,
          )
        : [];
      const readback = await waitForWorkflowReadback(
        () => emergency.getRecoveryPlan({
          auth: actor.auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress: actor.walletAddress,
          wireParams: [body.incidentId],
        }),
        (response) => readRecoveryPlanSummary(response.body).results.length > resultCountBefore,
        `recoverFromEmergency.executeRead.${stepIndex}`,
      );
      recoveryRead = readRecoveryPlanSummary(readback.body);
      executedSteps.push({
        stepIndex,
        submission: write.body,
        txHash,
        eventCount: events.length,
        recovery: recoveryRead,
      });
    }
  }

  let completion: {
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    incident: ReturnType<typeof readIncidentSummary>,
    recovery: NonNullable<typeof recoveryRead>,
  } | null = null;
  if (body.complete) {
    const actor = resolveActorOverride(context, auth, walletAddress, body.complete.actor, "recover-from-emergency", "complete");
    const write = await emergency.completeRecovery({
      auth: actor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [body.incidentId],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "complete-recovery");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.complete");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "recoverFromEmergency.complete") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => emergency.recoveryCompletedEventQuery({
            auth: actor.auth,
            ...buildEventWindow(receipt),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "recoverFromEmergency.recoveryCompleted",
        )
      : [];
    const incidentRead = await waitForWorkflowReadback(
      async () => ({
        statusCode: 200,
        body: {
          incident: await emergency.getIncident({
            auth: actor.auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress: actor.walletAddress,
            wireParams: [body.incidentId],
          }),
          recovery: await emergency.getRecoveryPlan({
            auth: actor.auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress: actor.walletAddress,
            wireParams: [body.incidentId],
          }),
        },
      }),
      (response) => {
        const payload = asRecord(response.body);
        const incident = readIncidentSummary(asRecord(payload?.incident)?.body ?? null);
        const recovery = readRecoveryPlanSummary(asRecord(payload?.recovery)?.body ?? null);
        return incident.resolved === true && recovery.completionTime !== "0";
      },
      "recoverFromEmergency.completeRead",
    );
    const incidentPayload = asRecord(incidentRead.body);
    const incident = readIncidentSummary(asRecord(incidentPayload?.incident)?.body ?? null);
    recoveryRead = readRecoveryPlanSummary(asRecord(incidentPayload?.recovery)?.body ?? null);
    completion = {
      submission: write.body,
      txHash,
      eventCount: events.length,
      incident,
      recovery: recoveryRead,
    };
  }

  let resume: {
    mode: z.infer<typeof resumeSchema>["mode"],
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    posture: Awaited<ReturnType<typeof readEmergencyPosture>>,
  } | null = null;
  if (body.resume) {
    const actor = resolveActorOverride(context, auth, walletAddress, body.resume.actor, "recover-from-emergency", "resume");
    if (body.resume.mode === "schedule") {
      const write = await emergency.scheduleEmergencyResume({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [body.resume.executeAfter!],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "schedule-resume");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.scheduleResume");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "recoverFromEmergency.scheduleResume") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.emergencyResumeScheduledEventQuery({
              auth: actor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            "recoverFromEmergency.resumeScheduled",
          )
        : [];
      resume = {
        mode: body.resume.mode,
        submission: write.body,
        txHash,
        eventCount: events.length,
        posture: await readEmergencyPosture(emergency, actor.auth, actor.walletAddress),
      };
    } else if (body.resume.mode === "execute-scheduled") {
      const write = await emergency.executeScheduledResume({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "execute-scheduled-resume");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.executeScheduledResume");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "recoverFromEmergency.executeScheduledResume") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.emergencyResumeExecutedEventQuery({
              auth: actor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            "recoverFromEmergency.resumeExecuted",
          )
        : [];
      await waitForEmergencyState(emergency, actor.auth, actor.walletAddress, ["0"], "recoverFromEmergency.resumeState");
      resume = {
        mode: body.resume.mode,
        submission: write.body,
        txHash,
        eventCount: events.length,
        posture: await readEmergencyPosture(emergency, actor.auth, actor.walletAddress),
      };
    } else {
      const write = await emergency.emergencyResume({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "recover-from-emergency", "emergency-resume");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "recoverFromEmergency.emergencyResume");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "recoverFromEmergency.emergencyResume") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.emergencyStateChangedEventQuery({
              auth: actor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            "recoverFromEmergency.emergencyStateChanged",
          )
        : [];
      await waitForEmergencyState(emergency, actor.auth, actor.walletAddress, ["0"], "recoverFromEmergency.resumeState");
      resume = {
        mode: body.resume.mode,
        submission: write.body,
        txHash,
        eventCount: events.length,
        posture: await readEmergencyPosture(emergency, actor.auth, actor.walletAddress),
      };
    }
  }

  const after = await runInspectEmergencyPostureWorkflow(context, auth, walletAddress, {
    incidentId: body.incidentId,
  });

  return {
    posture: {
      before: before.posture,
      after: after.posture,
    },
    recovery: {
      before: before.recovery,
      start,
      approval,
      executedSteps,
      completion,
      resume,
      after: after.recovery,
    },
    incident: {
      before: before.incident,
      after: after.incident,
    },
    summary: {
      incidentId: body.incidentId,
      recoveryPhaseBefore: before.recovery?.phase ?? null,
      recoveryPhaseAfter: after.recovery?.phase ?? null,
      completed: completion?.incident.resolved ?? false,
      resumedToNormal: after.posture.currentState === "0",
      executedStepCount: executedSteps.length,
      resumeMode: resume?.mode ?? null,
    },
  };
}
