import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import {
  hasTransactionHash,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { readMarketplacePaymentConfig, readPendingPaymentsSnapshot } from "./marketplace-payment-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import { assertExactAmountDelta, readEconomicAmount } from "./economic-invariants.js";

export const withdrawMarketplacePaymentsSchema = z.object({
  deadline: z.string().regex(/^\d+$/u).optional(),
});

export async function runWithdrawMarketplacePaymentsWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof withdrawMarketplacePaymentsSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const payee = await resolveWorkflowAccountAddress(context, auth, walletAddress, "withdrawMarketplacePayments");
  const paymentConfig = await readMarketplacePaymentConfig(marketplace, auth, walletAddress);

  if (paymentConfig.paymentPaused === true) {
    throw new HttpError(409, "withdraw-marketplace-payments requires payments to be unpaused");
  }

  const pendingBefore = await waitForWorkflowReadback(
    () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, { payee }).then((snapshot) => ({ statusCode: 200, body: snapshot })),
    (result) => result.statusCode === 200,
    "withdrawMarketplacePayments.pendingBefore",
  );
  const pendingBeforePayee = (pendingBefore.body as { payee?: unknown }).payee;
  const pendingBeforeAmount = readPendingPaymentAmount(
    pendingBeforePayee,
    "withdrawMarketplacePayments.pendingBefore.payee",
  );
  if (pendingBeforeAmount === 0n) {
    throw new HttpError(409, "withdraw-marketplace-payments requires pending payments");
  }

  const withdrawal = body.deadline
    ? await marketplace.withdrawPaymentsWithDeadline({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.deadline],
      })
    : await marketplace.withdrawPayments({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      });

  const withdrawalTxHash = await waitForWorkflowWriteReceipt(context, withdrawal.body, "withdrawMarketplacePayments.withdrawal");
  const withdrawalReceipt = withdrawalTxHash ? await readWorkflowReceipt(context, withdrawalTxHash, "withdrawMarketplacePayments.withdrawal") : null;
  const pendingAfter = await waitForWorkflowReadback(
    () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, { payee }).then((snapshot) => ({ statusCode: 200, body: snapshot })),
    (result) => {
      const pending = (result.body as { payee?: unknown }).payee;
      return result.statusCode === 200 && pending !== null && pending !== undefined && readEconomicAmount(
        pending as bigint | number | string,
        "withdrawMarketplacePayments.pendingAfter.payee",
      ) === 0n;
    },
    "withdrawMarketplacePayments.pendingAfter",
  );
  const pendingAfterPayee = (pendingAfter.body as { payee?: unknown }).payee;
  const pendingAfterAmount = readPendingPaymentAmount(
    pendingAfterPayee,
    "withdrawMarketplacePayments.pendingAfter.payee",
  );
  const pendingDelta = assertExactAmountDelta(
    "withdrawMarketplacePayments.pending",
    pendingBeforeAmount,
    pendingAfterAmount,
    -pendingBeforeAmount,
  );

  let withdrawalEvents: Awaited<ReturnType<typeof waitForWorkflowEventQuery>> = [];
  if (withdrawalReceipt) {
    withdrawalEvents = await waitForWorkflowEventQuery(
      () => marketplace.usdcpaymentWithdrawnEventQuery({
        auth,
        fromBlock: BigInt(withdrawalReceipt.blockNumber),
        toBlock: BigInt(withdrawalReceipt.blockNumber),
      }),
      (logs) => hasTransactionHash(logs, withdrawalTxHash),
      "withdrawMarketplacePayments.withdrawnEvent",
    );
  }

  return {
    preflight: {
      payee,
      paymentToken: paymentConfig.paymentToken,
      paymentPaused: paymentConfig.paymentPaused,
      pendingBefore: pendingBeforePayee,
    },
    withdrawal: {
      mode: body.deadline ? "deadline" : "standard",
      submission: withdrawal.body,
      txHash: withdrawalTxHash,
      pendingAfter: pendingAfterPayee,
      pendingDelta,
      releasedAmount: pendingBeforeAmount.toString(),
      eventCount: withdrawalEvents.length,
      deadline: body.deadline ?? null,
    },
    summary: {
      payee,
      clearedPending: true,
      deadline: body.deadline ?? null,
    },
  };
}

function readPendingPaymentAmount(value: unknown, label: string): bigint {
  if (value === null || value === undefined) {
    throw new Error(`${label} is missing`);
  }
  return readEconomicAmount(value as bigint | number | string, label);
}
