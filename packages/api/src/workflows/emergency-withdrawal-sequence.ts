import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createEmergencyPrimitiveService } from "../modules/emergency/primitives/generated/index.js";
import {
  actorOverrideSchema,
  addressSchema,
  asRecord,
  buildEventWindow,
  digitsSchema,
  hasTransactionHash,
  normalizeEmergencyExecutionError,
  normalizeRequestId,
  readBooleanBody,
  normalizeEventLogs,
  readScalarBody,
  readWorkflowReceipt,
  resolveActorOverride,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./emergency-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const emergencyWithdrawalSequenceWorkflowSchema = z.object({
  token: addressSchema,
  amount: digitsSchema,
  recipient: addressSchema,
  whitelistRecipient: z.boolean().default(false),
  whitelistActor: actorOverrideSchema.optional(),
  approvals: z.array(actorOverrideSchema).default([]),
  execute: actorOverrideSchema.optional(),
});

export async function runEmergencyWithdrawalSequenceWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof emergencyWithdrawalSequenceWorkflowSchema>,
) {
  const emergency = createEmergencyPrimitiveService(context);

  const recipientWhitelistedBefore = await emergency.isRecipientWhitelisted({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.recipient],
  });

  let whitelist: {
    submission: unknown,
    txHash: string | null,
    eventCount: number,
    recipientWhitelisted: boolean,
  } | null = null;
  if (body.whitelistRecipient && readBooleanBody(recipientWhitelistedBefore.body) !== true) {
    const actor = resolveActorOverride(
      context,
      auth,
      walletAddress,
      body.whitelistActor,
      "emergency-withdrawal-sequence",
      "whitelist",
    );
    const write = await emergency.setRecipientWhitelist({
      auth: actor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [body.recipient, true],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "set-recipient-whitelist");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "emergencyWithdrawalSequence.whitelist");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "emergencyWithdrawalSequence.whitelist") : null;
    const events = receipt
      ? await readOptionalEmergencyEventLogs(() => emergency.recipientWhitelistedEventQuery({
          auth: actor.auth,
          ...buildEventWindow(receipt),
        }))
      : [];
    const readback = await waitForWorkflowReadback(
      () => emergency.isRecipientWhitelisted({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [body.recipient],
      }),
      (result) => readBooleanBody(result.body) === true,
      "emergencyWithdrawalSequence.whitelistRead",
    );
    whitelist = {
      submission: write.body,
      txHash,
      eventCount: events.length,
      recipientWhitelisted: readBooleanBody(readback.body) === true,
    };
  }

  const request = await emergency.requestEmergencyWithdrawal({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.token, body.amount, body.recipient],
  }).catch((error: unknown) => {
    throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "request");
  });
  const requestTxHash = await waitForWorkflowWriteReceipt(context, request.body, "emergencyWithdrawalSequence.request");
  const requestReceipt = requestTxHash ? await readWorkflowReceipt(context, requestTxHash, "emergencyWithdrawalSequence.request") : null;
  const requestId = normalizeRequestId(request.body);

  const requestEvents = requestReceipt
    ? await readOptionalEmergencyEventLogs(() => emergency.emergencyWithdrawalRequestedEventQuery({
        auth,
        ...buildEventWindow(requestReceipt),
      }))
    : [];
  const instantExecutionEvents = requestReceipt
    ? await readOptionalEmergencyEventLogs(() => emergency.emergencyWithdrawalEventQuery({
        auth,
        ...buildEventWindow(requestReceipt),
      }))
    : [];

  const approvalCountAfterRequest = requestId && requestId !== `0x${"0".repeat(64)}`
    ? readScalarBody((await emergency.getApprovalCount({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [requestId],
    })).body)
    : null;

  const approvals: Array<{
    actor: string,
    submission: unknown,
    txHash: string | null,
    approvalCount: string | null,
    approvalEventCount: number,
    executedEventCount: number,
  }> = [];
  let executed = instantExecutionEvents.length > 0 || requestId === `0x${"0".repeat(64)}`;
  if (requestId && requestId !== `0x${"0".repeat(64)}`) {
    for (const actorOverride of body.approvals) {
      const actor = resolveActorOverride(
        context,
        auth,
        walletAddress,
        actorOverride,
        "emergency-withdrawal-sequence",
        "approval",
      );
      const write = await emergency.approveEmergencyWithdrawal({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [requestId],
      }).catch((error: unknown) => {
        throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "approve");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "emergencyWithdrawalSequence.approve");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "emergencyWithdrawalSequence.approve") : null;
      const approvalEvents = receipt
        ? await readOptionalEmergencyEventLogs(() => emergency.emergencyWithdrawalApprovedEventQuery({
            auth: actor.auth,
            ...buildEventWindow(receipt),
          }))
        : [];
      const executedEvents = receipt
        ? await readOptionalEmergencyEventLogs(() => emergency.emergencyWithdrawalExecutedEventQuery({
            auth: actor.auth,
            ...buildEventWindow(receipt),
          }))
        : [];
      const approvalCount = readScalarBody((await emergency.getApprovalCount({
        auth: actor.auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress: actor.walletAddress,
        wireParams: [requestId],
      })).body);
      executed = executed || executedEvents.length > 0;
      approvals.push({
        actor: actor.auth.apiKey,
        submission: write.body,
        txHash,
        approvalCount,
        approvalEventCount: approvalEvents.length,
        executedEventCount: executedEvents.length,
      });
    }
  }

  let execute: {
    actor: string,
    submission: unknown,
    txHash: string | null,
    eventCount: number,
  } | null = null;
  if (body.execute && requestId && requestId !== `0x${"0".repeat(64)}` && !executed) {
    const actor = resolveActorOverride(
      context,
      auth,
      walletAddress,
      body.execute,
      "emergency-withdrawal-sequence",
      "execute",
    );
    const write = await emergency.executeWithdrawal({
      auth: actor.auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress: actor.walletAddress,
      wireParams: [requestId],
    }).catch((error: unknown) => {
      throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "execute");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "emergencyWithdrawalSequence.execute");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "emergencyWithdrawalSequence.execute") : null;
    const events = receipt
      ? await readOptionalEmergencyEventLogs(() => emergency.emergencyWithdrawalExecutedEventQuery({
          auth: actor.auth,
          ...buildEventWindow(receipt),
        }))
      : [];
    executed = events.length > 0;
    execute = {
      actor: actor.auth.apiKey,
      submission: write.body,
      txHash,
      eventCount: events.length,
    };
  }

  const recipientWhitelistedAfter = await emergency.isRecipientWhitelisted({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.recipient],
  });

  return {
    whitelist,
    request: {
      submission: request.body,
      txHash: requestTxHash,
      requestId,
      approvalCountAfterRequest,
      requestEventCount: requestEvents.length,
      instantExecutionEventCount: instantExecutionEvents.length,
      instantExecuted: requestId === `0x${"0".repeat(64)}` || instantExecutionEvents.length > 0,
    },
    approvals,
    execute,
    withdrawalState: {
      recipient: body.recipient,
      recipientWhitelistedBefore: readBooleanBody(recipientWhitelistedBefore.body),
      recipientWhitelistedAfter: readBooleanBody(recipientWhitelistedAfter.body),
      executed,
    },
    summary: {
      token: body.token,
      amount: body.amount,
      recipient: body.recipient,
      requestId,
      approvalsRequested: (body.approvals ?? []).length,
      approvalsObserved: approvals.length,
      executed,
      requiresManualExecution: Boolean(requestId && requestId !== `0x${"0".repeat(64)}`),
    },
  };
}

async function readOptionalEmergencyEventLogs(read: () => Promise<unknown>) {
  return normalizeEventLogs(await read());
}
