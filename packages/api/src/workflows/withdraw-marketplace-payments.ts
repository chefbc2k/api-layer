import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import {
  hasTransactionHash,
  readBigInt,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { readMarketplacePaymentConfig, readPendingPaymentsSnapshot } from "./marketplace-payment-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

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
    throw new Error("withdraw-marketplace-payments requires payments to be unpaused");
  }

  const pendingBefore = await waitForWorkflowReadback(
    () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, { payee }).then((snapshot) => ({ statusCode: 200, body: snapshot })),
    (result) => result.statusCode === 200,
    "withdrawMarketplacePayments.pendingBefore",
  );
  if (readBigInt((pendingBefore.body as { payee?: unknown }).payee) === 0n) {
    throw new Error("withdraw-marketplace-payments requires pending payments");
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
    (result) => result.statusCode === 200 && readBigInt((result.body as { payee?: unknown }).payee) === 0n,
    "withdrawMarketplacePayments.pendingAfter",
  );

  const withdrawalEvents = withdrawalReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.usdcpaymentWithdrawnEventQuery({
          auth,
          fromBlock: BigInt(withdrawalReceipt.blockNumber),
          toBlock: BigInt(withdrawalReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, withdrawalTxHash),
        "withdrawMarketplacePayments.withdrawnEvent",
      )
    : [];

  return {
    preflight: {
      payee,
      paymentToken: paymentConfig.paymentToken,
      paymentPaused: paymentConfig.paymentPaused,
      pendingBefore: (pendingBefore.body as { payee?: unknown }).payee ?? null,
    },
    withdrawal: {
      mode: body.deadline ? "deadline" : "standard",
      submission: withdrawal.body,
      txHash: withdrawalTxHash,
      pendingAfter: (pendingAfter.body as { payee?: unknown }).payee ?? null,
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
