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
  readScalarBody,
  readWorkflowReceipt,
  resolveActorOverride,
  waitForEmergencyState,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./emergency-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

const emergencyStateSchema = z.enum(["PAUSED", "LOCKED_DOWN", "RECOVERY"]);
const incidentTypeSchema = z.enum([
  "SECURITY_BREACH",
  "SMART_CONTRACT_BUG",
  "MARKET_MANIPULATION",
  "SYSTEM_FAILURE",
  "EXTERNAL_THREAT",
  "GOVERNANCE_ATTACK",
  "ASSET_COMPROMISE",
]);
const responseActionSchema = z.enum([
  "PAUSE_TRADING",
  "FREEZE_ASSETS",
  "LOCK_TRANSFERS",
  "ENABLE_RECOVERY",
  "RESTORE_STATE",
  "ROLLBACK_CHANGES",
]);

const incidentContextSchema = z.object({
  id: digitsSchema.optional(),
  report: z.object({
    actor: actorOverrideSchema.optional(),
    incidentType: incidentTypeSchema,
    description: z.string().min(1),
  }).optional(),
  responseActions: z.array(responseActionSchema).min(1).optional(),
}).optional();

export const triggerEmergencyWorkflowSchema = z.object({
  emergency: z.object({
    actor: actorOverrideSchema.optional(),
    useEmergencyStop: z.boolean().default(false),
    state: emergencyStateSchema,
    reason: z.string().min(1),
  }),
  incident: incidentContextSchema,
  freezeAssets: z.object({
    actor: actorOverrideSchema.optional(),
    assetIds: z.array(digitsSchema).min(1),
    reason: z.string().min(1),
  }).optional(),
  pauseControl: z.object({
    actor: actorOverrideSchema.optional(),
    extendPausedUntil: digitsSchema.optional(),
    scheduleResumeAfter: digitsSchema.optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.emergency.useEmergencyStop && value.emergency.state !== "PAUSED") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["emergency", "state"],
      message: "trigger-emergency useEmergencyStop requires PAUSED state",
    });
  }
  if (value.incident?.responseActions && !value.incident.id && !value.incident.report) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["incident", "responseActions"],
      message: "trigger-emergency responseActions require incident id or incident report",
    });
  }
});

export async function runTriggerEmergencyWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof triggerEmergencyWorkflowSchema>,
) {
  const emergency = createEmergencyPrimitiveService(context);
  const postureBefore = await readEmergencyPosture(emergency, auth, walletAddress);

  let incidentId = body.incident?.id ?? null;
  let incidentReport: {
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    incidentId: string,
    read: ReturnType<typeof readIncidentSummary>,
  } | null = null;

  if (body.incident?.report) {
    const incidentActor = resolveActorOverride(
      context,
      auth,
      walletAddress,
      body.incident.report.actor,
      "trigger-emergency",
      "incident report",
    );
    const report = await emergency.reportIncident({
      auth: incidentActor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: incidentActor.walletAddress,
      wireParams: [incidentTypeToCode(body.incident.report.incidentType), body.incident.report.description],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "trigger-emergency", "report-incident");
    });
    const reportTxHash = await waitForWorkflowWriteReceipt(context, report.body, "triggerEmergency.reportIncident");
    const reportReceipt = reportTxHash ? await readWorkflowReceipt(context, reportTxHash, "triggerEmergency.reportIncident") : null;
    incidentId = readScalarBody(report.body);
    const reportEvents = reportReceipt
      ? await waitForWorkflowEventQuery(
          () => emergency.incidentReportedEventQuery({
            auth: incidentActor.auth,
            ...buildEventWindow(reportReceipt),
          }),
          (logs) => hasTransactionHash(logs, reportTxHash),
          "triggerEmergency.incidentReported",
        )
      : [];
    const incidentRead = incidentId
      ? await waitForWorkflowReadback(
          () => emergency.getIncident({
            auth: incidentActor.auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress: incidentActor.walletAddress,
            wireParams: [incidentId],
          }),
          (result) => readScalarBody(asRecord(result.body)?.id) === incidentId,
          "triggerEmergency.incidentRead",
        )
      : null;
    incidentReport = incidentId && incidentRead
      ? {
        submission: report.body,
        txHash: reportTxHash,
        eventCount: reportEvents.length,
        incidentId,
        read: readIncidentSummary(incidentRead.body),
      }
      : null;
  }

  const emergencyActor = resolveActorOverride(
    context,
    auth,
    walletAddress,
    body.emergency.actor,
    "trigger-emergency",
    "emergency transition",
  );
  const transition = body.emergency.useEmergencyStop
    ? await emergency.emergencyStop({
      auth: emergencyActor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: emergencyActor.walletAddress,
      wireParams: [],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "trigger-emergency", "emergency-stop");
    })
    : await emergency.triggerEmergency({
      auth: emergencyActor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: emergencyActor.walletAddress,
      wireParams: [emergencyStateToCode(body.emergency.state), body.emergency.reason],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "trigger-emergency", "trigger-emergency");
    });
  const transitionTxHash = await waitForWorkflowWriteReceipt(context, transition.body, "triggerEmergency.transition");
  const transitionReceipt = transitionTxHash ? await readWorkflowReceipt(context, transitionTxHash, "triggerEmergency.transition") : null;
  const transitionEvents = transitionReceipt
    ? await waitForWorkflowEventQuery(
        () => emergency.emergencyStateChangedEventQuery({
          auth: emergencyActor.auth,
          ...buildEventWindow(transitionReceipt),
        }),
        (logs) => hasTransactionHash(logs, transitionTxHash),
        "triggerEmergency.stateChanged",
      )
    : [];
  const postureAfterTransition = await waitForEmergencyState(
    emergency,
    emergencyActor.auth,
    emergencyActor.walletAddress,
    body.emergency.useEmergencyStop
      ? ["1"]
      : body.emergency.state === "PAUSED"
        ? ["1", "2"]
        : [emergencyStateToCode(body.emergency.state)],
    "triggerEmergency.postureAfterTransition",
  );

  let response: {
    submission: unknown,
    txHash: string | null,
    incidentId: string,
    eventCount: number,
    incident: ReturnType<typeof readIncidentSummary>,
  } | null = null;
  if (body.incident?.responseActions && incidentId) {
    const write = await emergency.executeResponse({
      auth: emergencyActor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: emergencyActor.walletAddress,
      wireParams: [incidentId, body.incident.responseActions.map(responseActionToCode)],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "trigger-emergency", "execute-response");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "triggerEmergency.executeResponse");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "triggerEmergency.executeResponse") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => emergency.responseExecutedEventQuery({
            auth: emergencyActor.auth,
            ...buildEventWindow(receipt),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "triggerEmergency.responseExecuted",
        )
      : [];
    const incidentRead = await waitForWorkflowReadback(
      () => emergency.getIncident({
        auth: emergencyActor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: emergencyActor.walletAddress,
        wireParams: [incidentId],
      }),
      (result) => {
        const read = readIncidentSummary(result.body);
        return read.actions.length >= body.incident!.responseActions!.length;
      },
      "triggerEmergency.incidentAfterResponse",
    );
    response = {
      submission: write.body,
      txHash,
      incidentId,
      eventCount: events.length,
      incident: readIncidentSummary(incidentRead.body),
    };
  }

  let assetFreeze: {
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    frozenAssetIds: string[],
  } | null = null;
  if (body.freezeAssets) {
    const freezeActor = resolveActorOverride(
      context,
      auth,
      walletAddress,
      body.freezeAssets.actor,
      "trigger-emergency",
      "freeze-assets",
    );
    const write = await emergency.freezeAssets({
      auth: freezeActor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: freezeActor.walletAddress,
      wireParams: [body.freezeAssets.assetIds, body.freezeAssets.reason],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "trigger-emergency", "freeze-assets");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "triggerEmergency.freezeAssets");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "triggerEmergency.freezeAssets") : null;
    const events = receipt
      ? await waitForWorkflowEventQuery(
          () => emergency.assetsFrozenEventQuery({
            auth: freezeActor.auth,
            ...buildEventWindow(receipt),
          }),
          (logs) => hasTransactionHash(logs, txHash),
          "triggerEmergency.assetsFrozen",
        )
      : [];
    await waitForWorkflowReadback(
      async () => ({
        statusCode: 200,
        body: await Promise.all(body.freezeAssets!.assetIds.map(async (assetId) => {
          const result = await emergency.isAssetFrozen({
            auth: freezeActor.auth,
            api: { executionSource: "live", gaslessMode: "none" },
            walletAddress: freezeActor.walletAddress,
            wireParams: [assetId],
          });
          return { assetId, frozen: result.body === true };
        })),
      }),
      (result) => Array.isArray(result.body) && result.body.every((entry) => asRecord(entry)?.frozen === true),
      "triggerEmergency.freezeAssetsRead",
    );
    assetFreeze = {
      submission: write.body,
      txHash,
      eventCount: events.length,
      frozenAssetIds: [...body.freezeAssets.assetIds],
    };
  }

  let pauseControl: {
    extendPause: {
      submission: unknown,
      txHash: string | null,
      eventCount: number,
      pausedUntil: string,
    } | null,
    scheduleResume: {
      submission: unknown,
      txHash: string | null,
      eventCount: number,
      executeAfter: string,
    } | null,
  } | null = null;
  if (body.pauseControl) {
    const pauseActor = resolveActorOverride(
      context,
      auth,
      walletAddress,
      body.pauseControl.actor,
      "trigger-emergency",
      "pause-control",
    );
    let extendPause: {
      submission: unknown,
      txHash: string | null,
      eventCount: number,
      pausedUntil: string,
    } | null = null;
    let scheduleResume: {
      submission: unknown,
      txHash: string | null,
      eventCount: number,
      executeAfter: string,
    } | null = null;

    if (body.pauseControl.extendPausedUntil) {
      const write = await emergency.extendPausedUntil({
        auth: pauseActor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: pauseActor.walletAddress,
        wireParams: [body.pauseControl.extendPausedUntil],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "trigger-emergency", "extend-paused-until");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "triggerEmergency.extendPausedUntil");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "triggerEmergency.extendPausedUntil") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.pauseExtendedEventQuery({
              auth: pauseActor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            "triggerEmergency.pauseExtended",
          )
        : [];
      extendPause = {
        submission: write.body,
        txHash,
        eventCount: events.length,
        pausedUntil: body.pauseControl.extendPausedUntil,
      };
    }

    if (body.pauseControl.scheduleResumeAfter) {
      const write = await emergency.scheduleEmergencyResume({
        auth: pauseActor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: pauseActor.walletAddress,
        wireParams: [body.pauseControl.scheduleResumeAfter],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "trigger-emergency", "schedule-emergency-resume");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "triggerEmergency.scheduleEmergencyResume");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "triggerEmergency.scheduleEmergencyResume") : null;
      const events = receipt
        ? await waitForWorkflowEventQuery(
            () => emergency.emergencyResumeScheduledEventQuery({
              auth: pauseActor.auth,
              ...buildEventWindow(receipt),
            }),
            (logs) => hasTransactionHash(logs, txHash),
            "triggerEmergency.resumeScheduled",
          )
        : [];
      scheduleResume = {
        submission: write.body,
        txHash,
        eventCount: events.length,
        executeAfter: body.pauseControl.scheduleResumeAfter,
      };
    }

    pauseControl = { extendPause, scheduleResume };
  }

  const postureAfter = await readEmergencyPosture(emergency, emergencyActor.auth, emergencyActor.walletAddress);

  return {
    posture: {
      before: postureBefore,
      after: postureAfter,
    },
    incident: {
      usedIncidentId: incidentId,
      report: incidentReport,
    },
    emergency: {
      transition: {
        submission: transition.body,
        txHash: transitionTxHash,
        eventCount: transitionEvents.length,
        mode: body.emergency.useEmergencyStop ? "emergency-stop" : "trigger-emergency",
        requestedState: body.emergency.state,
        resultingState: postureAfterTransition.state,
        resultingStateLabel: postureAfterTransition.stateLabel,
      },
    },
    response,
    assetFreeze,
    pauseControl,
    summary: {
      incidentId,
      requestedState: body.emergency.state,
      resultingState: postureAfter.currentState,
      resultingStateLabel: postureAfter.currentStateLabel,
      responseExecuted: Boolean(response),
      assetsFrozen: assetFreeze?.frozenAssetIds.length ?? 0,
      resumeScheduled: Boolean(pauseControl?.scheduleResume),
      pauseExtended: Boolean(pauseControl?.extendPause),
    },
  };
}

function emergencyStateToCode(value: z.infer<typeof emergencyStateSchema>): string {
  switch (value) {
    case "PAUSED":
      return "1";
    case "LOCKED_DOWN":
      return "2";
    case "RECOVERY":
      return "3";
  }
}

function incidentTypeToCode(value: z.infer<typeof incidentTypeSchema>): string {
  switch (value) {
    case "SECURITY_BREACH":
      return "0";
    case "SMART_CONTRACT_BUG":
      return "1";
    case "MARKET_MANIPULATION":
      return "2";
    case "SYSTEM_FAILURE":
      return "3";
    case "EXTERNAL_THREAT":
      return "4";
    case "GOVERNANCE_ATTACK":
      return "5";
    case "ASSET_COMPROMISE":
      return "6";
  }
}

function responseActionToCode(value: z.infer<typeof responseActionSchema>): string {
  switch (value) {
    case "PAUSE_TRADING":
      return "0";
    case "FREEZE_ASSETS":
      return "1";
    case "LOCK_TRANSFERS":
      return "2";
    case "ENABLE_RECOVERY":
      return "3";
    case "RESTORE_STATE":
      return "4";
    case "ROLLBACK_CHANGES":
      return "5";
  }
}
