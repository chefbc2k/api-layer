import { Interface } from "ethers";
import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import {
  readMarketplacePaymentConfig,
  readPendingPaymentsSnapshot,
} from "./marketplace-payment-helpers.js";
import { resolveWorkflowAccountAddress, waitForWorkflowReadback } from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import {
  assertConservedDeltas,
  assertExactAmountDelta,
  assertNoEconomicSideEffects,
  readEconomicAmount,
} from "./economic-invariants.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const amountSchema = z.string().regex(/^\d+$/u).refine((value) => BigInt(value) > 0n, "amount must be greater than zero");
const approvalCountSchema = z.string().regex(/^\d+$/u).refine((value) => BigInt(value) >= 2n, "requiredApprovals must be at least 2");

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: addressSchema.optional(),
});

export const treasuryMultisigWithdrawalSchema = z.object({
  amount: amountSchema.optional(),
  recipient: addressSchema.optional(),
  requiredApprovals: approvalCountSchema,
  approvers: z.array(actorOverrideSchema).min(2),
  executor: actorOverrideSchema.optional(),
});

const erc20BalanceInterface = new Interface(["function balanceOf(address account) view returns (uint256)"]);

type ResolvedActor = {
  auth: AuthContext;
  walletAddress: string | undefined;
  account: string;
};

type TreasuryEconomicState = {
  pending: bigint;
  custody: bigint;
  recipient: bigint;
};

export async function runTreasuryMultisigWithdrawalWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof treasuryMultisigWithdrawalSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const executor = await resolveActor(context, auth, walletAddress, body.executor, "treasuryMultisigWithdrawal.executor");
  const paymentConfig = await readMarketplacePaymentConfig(marketplace, executor.auth, executor.walletAddress);
  if (paymentConfig.paymentPaused === true || paymentConfig.marketplacePaused === true) {
    throw new HttpError(409, "treasury-multisig-withdrawal requires marketplace payments to be unpaused");
  }
  if (!paymentConfig.paymentToken || !paymentConfig.treasury) {
    throw new HttpError(409, "treasury-multisig-withdrawal requires configured payment-token and treasury addresses");
  }
  if (executor.account.toLowerCase() !== paymentConfig.treasury.toLowerCase()) {
    throw new HttpError(409, "treasury-multisig-withdrawal executor must be the configured treasury");
  }

  const recipient = body.recipient ?? executor.account;
  const custodyAddress = context.addressBook.toJSON().diamond;
  if (recipient.toLowerCase() === custodyAddress.toLowerCase()) {
    throw new HttpError(400, "treasury-multisig-withdrawal recipient cannot be protocol custody");
  }

  const approvers = await Promise.all(body.approvers.map((actor, index) =>
    resolveActor(context, auth, walletAddress, actor, `treasuryMultisigWithdrawal.approvers.${index}`)));
  const uniqueApprovers = new Set(approvers.map((actor) => actor.account.toLowerCase()));
  if (uniqueApprovers.size !== approvers.length) {
    throw new HttpError(400, "treasury-multisig-withdrawal requires distinct approver accounts");
  }
  const requiredApprovals = readEconomicAmount(body.requiredApprovals, "treasuryMultisigWithdrawal.requiredApprovals");
  if (requiredApprovals > BigInt(approvers.length)) {
    throw new HttpError(400, "treasury-multisig-withdrawal requires enough supplied approvers");
  }

  const before = await readTreasuryEconomicState(
    context,
    marketplace,
    executor.auth,
    executor.walletAddress,
    paymentConfig.paymentToken,
    custodyAddress,
    executor.account,
    recipient,
  );
  const amount = body.amount === undefined
    ? before.pending
    : readEconomicAmount(body.amount, "treasuryMultisigWithdrawal.amount");
  if (amount === 0n || amount > before.pending) {
    throw new HttpError(409, "treasury-multisig-withdrawal amount must be covered by the treasury pending liability", {
      amount: amount.toString(),
      pending: before.pending.toString(),
    });
  }

  const approvalTxHashes: string[] = [];
  for (const [index, approver] of approvers.entries()) {
    try {
      const approval = await marketplace.approveMultisigWithdrawal({
        auth: approver.auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress: approver.walletAddress,
        wireParams: [paymentConfig.paymentToken, amount.toString(), recipient],
      });
      approvalTxHashes.push(await requireConfirmedWrite(
        context,
        approval.body,
        `treasuryMultisigWithdrawal.approval.${index}`,
      ));
    } catch (error) {
      await assertCurrentEconomicStateUnchanged(
        context,
        marketplace,
        executor,
        paymentConfig.paymentToken,
        custodyAddress,
        recipient,
        before,
        "treasuryMultisigWithdrawal.failedApproval",
      );
      throw partialMultisigFailure(
        "treasury-multisig-withdrawal approval failed",
        error,
        approvalTxHashes,
      );
    }
  }

  const afterApprovals = await readTreasuryEconomicState(
    context,
    marketplace,
    executor.auth,
    executor.walletAddress,
    paymentConfig.paymentToken,
    custodyAddress,
    executor.account,
    recipient,
  );
  assertNoEconomicSideEffects("treasuryMultisigWithdrawal.approvals", before, afterApprovals);

  let executionTxHash: string;
  try {
    const execution = await marketplace.executeMultisigWithdrawal({
      auth: executor.auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress: executor.walletAddress,
      wireParams: [paymentConfig.paymentToken, amount.toString(), recipient, requiredApprovals.toString()],
    });
    executionTxHash = await requireConfirmedWrite(
      context,
      execution.body,
      "treasuryMultisigWithdrawal.execution",
    );
  } catch (error) {
    await assertCurrentEconomicStateUnchanged(
      context,
      marketplace,
      executor,
      paymentConfig.paymentToken,
      custodyAddress,
      recipient,
      before,
      "treasuryMultisigWithdrawal.failedExecution",
    );
    throw partialMultisigFailure(
      "treasury-multisig-withdrawal execution failed after approvals",
      error,
      approvalTxHashes,
    );
  }

  const expectedAfter = {
    pending: before.pending - amount,
    custody: before.custody - amount,
    recipient: before.recipient + amount,
  };
  const afterResult = await waitForWorkflowReadback(
    () => readTreasuryEconomicState(
      context,
      marketplace,
      executor.auth,
      executor.walletAddress,
      paymentConfig.paymentToken!,
      custodyAddress,
      executor.account,
      recipient,
    ).then((state) => ({ statusCode: 200, body: state })),
    (result) => {
      const state = result.body as TreasuryEconomicState;
      return state.pending === expectedAfter.pending &&
        state.custody === expectedAfter.custody &&
        state.recipient === expectedAfter.recipient;
    },
    "treasuryMultisigWithdrawal.economicsAfter",
  );
  const after = afterResult.body as TreasuryEconomicState;
  const pending = assertExactAmountDelta(
    "treasuryMultisigWithdrawal.pending",
    before.pending,
    after.pending,
    -amount,
  );
  const custody = assertExactAmountDelta(
    "treasuryMultisigWithdrawal.custody",
    before.custody,
    after.custody,
    -amount,
  );
  const recipientBalance = assertExactAmountDelta(
    "treasuryMultisigWithdrawal.recipient",
    before.recipient,
    after.recipient,
    amount,
  );
  const conservation = assertConservedDeltas(
    "treasuryMultisigWithdrawal.conservation",
    [custody.delta, recipientBalance.delta],
  );

  return {
    preflight: {
      paymentToken: paymentConfig.paymentToken,
      treasury: executor.account,
      recipient,
      amount: amount.toString(),
      pendingBefore: before.pending.toString(),
      requiredApprovals: requiredApprovals.toString(),
    },
    approvals: {
      accounts: approvers.map((actor) => actor.account),
      txHashes: approvalTxHashes,
      economicsUnchanged: true,
    },
    execution: {
      txHash: executionTxHash,
      pending,
      custody,
      recipient: recipientBalance,
      conservation,
    },
    summary: {
      treasury: executor.account,
      recipient,
      releasedAmount: amount.toString(),
      remainingPending: after.pending.toString(),
      approvalCount: approvalTxHashes.length,
    },
  };
}

async function resolveActor(
  context: ApiExecutionContext,
  parentAuth: AuthContext,
  parentWalletAddress: string | undefined,
  override: z.infer<typeof actorOverrideSchema> | undefined,
  label: string,
): Promise<ResolvedActor> {
  const auth = override ? context.apiKeys[override.apiKey] : parentAuth;
  if (!auth) {
    throw new HttpError(400, `${label} received unknown apiKey`);
  }
  const walletAddress = override?.walletAddress ?? parentWalletAddress;
  return {
    auth,
    walletAddress,
    account: await resolveWorkflowAccountAddress(context, auth, walletAddress, label),
  };
}

async function requireConfirmedWrite(
  context: ApiExecutionContext,
  payload: unknown,
  label: string,
): Promise<string> {
  const txHash = await waitForWorkflowWriteReceipt(context, payload, label);
  if (!txHash) {
    throw new Error(`${label} did not return a transaction hash`);
  }
  return txHash;
}

async function readTreasuryEconomicState(
  context: ApiExecutionContext,
  marketplace: Pick<ReturnType<typeof createMarketplacePrimitiveService>, "getPendingPayments">,
  auth: AuthContext,
  walletAddress: string | undefined,
  paymentToken: string,
  custodyAddress: string,
  treasury: string,
  recipient: string,
): Promise<TreasuryEconomicState> {
  const [pendingSnapshot, balances] = await Promise.all([
    readPendingPaymentsSnapshot(marketplace, auth, walletAddress, { payee: treasury }),
    context.providerRouter.withProvider(
      "read",
      "workflow.treasuryMultisigWithdrawal.paymentTokenBalances",
      async (provider) => {
        const readBalance = async (account: string) => {
          const result = await provider.call({
            to: paymentToken,
            data: erc20BalanceInterface.encodeFunctionData("balanceOf", [account]),
          });
          const decoded = erc20BalanceInterface.decodeFunctionResult("balanceOf", result);
          return readEconomicAmount(decoded[0] as bigint, `treasuryMultisigWithdrawal.balanceOf.${account}`);
        };
        const [custody, recipientBalance] = await Promise.all([
          readBalance(custodyAddress),
          readBalance(recipient),
        ]);
        return { custody, recipient: recipientBalance };
      },
    ),
  ]);
  if (pendingSnapshot.payee === null || pendingSnapshot.payee === undefined) {
    throw new Error("treasuryMultisigWithdrawal.pending is missing");
  }
  return {
    pending: readEconomicAmount(pendingSnapshot.payee, "treasuryMultisigWithdrawal.pending"),
    custody: balances.custody,
    recipient: balances.recipient,
  };
}

async function assertCurrentEconomicStateUnchanged(
  context: ApiExecutionContext,
  marketplace: Pick<ReturnType<typeof createMarketplacePrimitiveService>, "getPendingPayments">,
  executor: ResolvedActor,
  paymentToken: string,
  custodyAddress: string,
  recipient: string,
  before: TreasuryEconomicState,
  label: string,
) {
  const after = await readTreasuryEconomicState(
    context,
    marketplace,
    executor.auth,
    executor.walletAddress,
    paymentToken,
    custodyAddress,
    executor.account,
    recipient,
  );
  assertNoEconomicSideEffects(label, before, after);
}

function partialMultisigFailure(
  message: string,
  cause: unknown,
  confirmedApprovalTxHashes: string[],
) {
  return new HttpError(
    cause instanceof HttpError ? cause.statusCode : 500,
    message,
    {
      confirmedApprovalTxHashes,
      economicStateUnchanged: true,
      cause: cause instanceof Error ? cause.message : String(cause),
    },
  );
}
