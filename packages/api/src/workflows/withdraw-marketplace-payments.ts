import { Interface } from "ethers";
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
import {
  assertConservedDeltas,
  assertExactAmountDelta,
  assertNoEconomicSideEffects,
  readEconomicAmount,
} from "./economic-invariants.js";

const erc20BalanceInterface = new Interface(["function balanceOf(address account) view returns (uint256)"]);

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
  if (!paymentConfig.paymentToken) {
    throw new HttpError(409, "withdraw-marketplace-payments requires a configured payment token");
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

  const custodyAddress = context.addressBook.toJSON().diamond;
  const economicsBefore = await readPaymentTokenBalances(
    context,
    paymentConfig.paymentToken,
    custodyAddress,
    payee,
  );

  let withdrawal: Awaited<ReturnType<typeof marketplace.withdrawPayments>>;
  let withdrawalTxHash: string | null;
  try {
    withdrawal = body.deadline
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
    withdrawalTxHash = await waitForWorkflowWriteReceipt(context, withdrawal.body, "withdrawMarketplacePayments.withdrawal");
  } catch (error) {
    await assertFailedWithdrawalHasNoEconomicSideEffects(
      context,
      marketplace,
      auth,
      walletAddress,
      paymentConfig.paymentToken,
      custodyAddress,
      payee,
      pendingBeforeAmount,
      economicsBefore,
    );
    throw error;
  }
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
  const economicsAfter = await waitForWorkflowReadback(
    () => readPaymentTokenBalances(
      context,
      paymentConfig.paymentToken!,
      custodyAddress,
      payee,
    ).then((balances) => ({ statusCode: 200, body: balances })),
    (result) => {
      const balances = result.body as PaymentTokenBalances;
      return result.statusCode === 200 &&
        balances.custody === economicsBefore.custody - pendingBeforeAmount &&
        balances.payee === economicsBefore.payee + pendingBeforeAmount;
    },
    "withdrawMarketplacePayments.paymentTokenBalancesAfter",
  );
  const afterBalances = economicsAfter.body as PaymentTokenBalances;
  const custodyDelta = assertExactAmountDelta(
    "withdrawMarketplacePayments.paymentTokenCustody",
    economicsBefore.custody,
    afterBalances.custody,
    -pendingBeforeAmount,
  );
  const payeeDelta = assertExactAmountDelta(
    "withdrawMarketplacePayments.paymentTokenPayee",
    economicsBefore.payee,
    afterBalances.payee,
    pendingBeforeAmount,
  );
  const conservation = assertConservedDeltas(
    "withdrawMarketplacePayments.paymentTokenConservation",
    [custodyDelta.delta, payeeDelta.delta],
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
      economics: {
        paymentToken: paymentConfig.paymentToken,
        custodyAddress,
        custody: custodyDelta,
        payee: payeeDelta,
        conservation,
      },
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

type PaymentTokenBalances = {
  custody: bigint;
  payee: bigint;
};

async function readPaymentTokenBalances(
  context: ApiExecutionContext,
  paymentToken: string,
  custody: string,
  payee: string,
): Promise<PaymentTokenBalances> {
  return context.providerRouter.withProvider(
    "read",
    "workflow.withdrawMarketplacePayments.paymentTokenBalances",
    async (provider) => {
      const readBalance = async (account: string) => {
        const result = await provider.call({
          to: paymentToken,
          data: erc20BalanceInterface.encodeFunctionData("balanceOf", [account]),
        });
        const decoded = erc20BalanceInterface.decodeFunctionResult("balanceOf", result);
        return readEconomicAmount(decoded[0] as bigint, `withdrawMarketplacePayments.balanceOf.${account}`);
      };
      const [custodyBalance, payeeBalance] = await Promise.all([
        readBalance(custody),
        readBalance(payee),
      ]);
      return { custody: custodyBalance, payee: payeeBalance };
    },
  );
}

async function assertFailedWithdrawalHasNoEconomicSideEffects(
  context: ApiExecutionContext,
  marketplace: Pick<ReturnType<typeof createMarketplacePrimitiveService>, "getPendingPayments">,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  paymentToken: string,
  custodyAddress: string,
  payee: string,
  pendingBefore: bigint,
  balancesBefore: PaymentTokenBalances,
): Promise<void> {
  const [pendingAfterSnapshot, balancesAfter] = await Promise.all([
    readPendingPaymentsSnapshot(marketplace, auth, walletAddress, { payee }),
    readPaymentTokenBalances(context, paymentToken, custodyAddress, payee),
  ]);
  const pendingAfter = readPendingPaymentAmount(
    pendingAfterSnapshot.payee,
    "withdrawMarketplacePayments.failed.pendingAfter.payee",
  );
  assertNoEconomicSideEffects("withdrawMarketplacePayments.failed", {
    pending: pendingBefore,
    custody: balancesBefore.custody,
    payee: balancesBefore.payee,
  }, {
    pending: pendingAfter,
    custody: balancesAfter.custody,
    payee: balancesAfter.payee,
  });
}

function readPendingPaymentAmount(value: unknown, label: string): bigint {
  if (value === null || value === undefined) {
    throw new Error(`${label} is missing`);
  }
  return readEconomicAmount(value as bigint | number | string, label);
}
