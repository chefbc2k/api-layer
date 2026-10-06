import { Interface, ZeroAddress, type TransactionReceipt } from "ethers";
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
import {
  assertConservedDeltas,
  assertExactAmountDelta,
  readEconomicAmount,
} from "./economic-invariants.js";

const erc20BalanceInterface = new Interface(["function balanceOf(address account) view returns (uint256)"]);

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
  const custodyAddress = context.addressBook.toJSON().diamond;

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

  const economicsBefore = await readWithdrawalBalances(context, body.token, custodyAddress, body.recipient);
  const economicReceipts: TransactionReceipt[] = [];
  const request = await emergency.requestEmergencyWithdrawal({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.token, body.amount, body.recipient],
  }).catch(async (error: unknown) => {
    await assertFailedWithdrawalHasNoAssetSideEffects(
      context,
      body.token,
      custodyAddress,
      body.recipient,
      economicsBefore,
      "emergencyWithdrawalSequence.failedRequest",
    );
    throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "request");
  });
  const requestTxHash = await waitForWorkflowWriteReceipt(context, request.body, "emergencyWithdrawalSequence.request");
  const requestReceipt = requestTxHash ? await readWorkflowReceipt(context, requestTxHash, "emergencyWithdrawalSequence.request") : null;
  if (requestReceipt) {
    economicReceipts.push(requestReceipt);
  }
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
      if (executed) {
        break;
      }
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
      }).catch(async (error: unknown) => {
        await assertFailedWithdrawalHasNoAssetSideEffects(
          context,
          body.token,
          custodyAddress,
          body.recipient,
          economicsBefore,
          "emergencyWithdrawalSequence.failedApproval",
          economicReceipts,
        );
        throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "approve");
      });
      const txHash = await waitForWorkflowWriteReceipt(context, write.body, "emergencyWithdrawalSequence.approve");
      const receipt = txHash ? await readWorkflowReceipt(context, txHash, "emergencyWithdrawalSequence.approve") : null;
      if (receipt) {
        economicReceipts.push(receipt);
      }
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
    }).catch(async (error: unknown) => {
      await assertFailedWithdrawalHasNoAssetSideEffects(
        context,
        body.token,
        custodyAddress,
        body.recipient,
        economicsBefore,
        "emergencyWithdrawalSequence.failedExecute",
        economicReceipts,
      );
      throw normalizeEmergencyExecutionError(error, "emergency-withdrawal-sequence", "execute");
    });
    const txHash = await waitForWorkflowWriteReceipt(context, write.body, "emergencyWithdrawalSequence.execute");
    const receipt = txHash ? await readWorkflowReceipt(context, txHash, "emergencyWithdrawalSequence.execute") : null;
    if (receipt) {
      economicReceipts.push(receipt);
    }
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
  const economicsAfter = await readWithdrawalBalances(context, body.token, custodyAddress, body.recipient);
  const economics = assertWithdrawalEconomics(
    body.token,
    body.amount,
    body.recipient,
    economicsBefore,
    economicsAfter,
    economicReceipts,
    executed,
  );

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
    economics,
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

type WithdrawalBalances = {
  custody: bigint;
  recipient: bigint;
};

async function readWithdrawalBalances(
  context: ApiExecutionContext,
  token: string,
  custody: string,
  recipient: string,
): Promise<WithdrawalBalances> {
  return context.providerRouter.withProvider(
    "read",
    "workflow.emergencyWithdrawalSequence.assetBalances",
    async (provider) => {
      if (token.toLowerCase() === ZeroAddress) {
        const [custodyBalance, recipientBalance] = await Promise.all([
          provider.getBalance(custody),
          provider.getBalance(recipient),
        ]);
        return { custody: custodyBalance, recipient: recipientBalance };
      }
      const readTokenBalance = async (account: string) => {
        const result = await provider.call({
          to: token,
          data: erc20BalanceInterface.encodeFunctionData("balanceOf", [account]),
        });
        const decoded = erc20BalanceInterface.decodeFunctionResult("balanceOf", result);
        return readEconomicAmount(decoded[0] as bigint, `emergencyWithdrawalSequence.balanceOf.${account}`);
      };
      const [custodyBalance, recipientBalance] = await Promise.all([
        readTokenBalance(custody),
        readTokenBalance(recipient),
      ]);
      return { custody: custodyBalance, recipient: recipientBalance };
    },
  );
}

async function assertFailedWithdrawalHasNoAssetSideEffects(
  context: ApiExecutionContext,
  token: string,
  custody: string,
  recipient: string,
  before: WithdrawalBalances,
  label: string,
  receipts: readonly TransactionReceipt[] = [],
): Promise<void> {
  const after = await readWithdrawalBalances(context, token, custody, recipient);
  try {
    assertWithdrawalEconomics(token, "0", recipient, before, after, receipts, false);
  } catch (error) {
    throw new Error(`${label} economic invariant failed: ${String((error as { message?: unknown }).message ?? error)}`);
  }
}

function assertWithdrawalEconomics(
  token: string,
  amountInput: string,
  recipient: string,
  before: WithdrawalBalances,
  after: WithdrawalBalances,
  receipts: readonly TransactionReceipt[],
  executed: boolean,
) {
  const amount = readEconomicAmount(amountInput, "emergencyWithdrawalSequence.amount");
  const released = executed ? amount : 0n;
  const custody = assertExactAmountDelta(
    "emergencyWithdrawalSequence.custody",
    before.custody,
    after.custody,
    -released,
  );
  const recipientGas = token.toLowerCase() === ZeroAddress
    ? receipts.reduce((total, receipt) => receipt.from.toLowerCase() === recipient.toLowerCase() ? total + receipt.fee : total, 0n)
    : 0n;
  const recipientDelta = assertExactAmountDelta(
    "emergencyWithdrawalSequence.recipient",
    before.recipient,
    after.recipient,
    released - recipientGas,
  );
  assertConservedDeltas(
    "emergencyWithdrawalSequence.assetConservation",
    [custody.delta, recipientDelta.delta, recipientGas],
  );
  return {
    asset: token.toLowerCase() === ZeroAddress ? "native" : "erc20",
    custody,
    recipient: recipientDelta,
    recipientGas: recipientGas.toString(),
    released: released.toString(),
  };
}
