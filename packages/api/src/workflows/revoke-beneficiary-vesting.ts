import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  extractRevokedAmountFromLogs,
  getReleasedAmount,
  getTotalAmount,
  isVestingScheduleRevoked,
  readBigInt,
  readVestingState,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  hasTransactionHash,
  normalizeRevokeVestingExecutionError,
} from "./vesting-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import { assertExactAmountDelta, assertNoEconomicSideEffects } from "./economic-invariants.js";

export const revokeBeneficiaryVestingSchema = z.object({
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

export async function runRevokeBeneficiaryVestingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof revokeBeneficiaryVestingSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const before = await readVestingState(tokenomics, auth, walletAddress, body.beneficiary);
  const totalBefore = getTotalAmount(before.schedule.body);
  const releasedBefore = getReleasedAmount(before.schedule.body);
  if (releasedBefore > totalBefore) {
    throw new Error("revokeBeneficiaryVesting economic invariant failed: released amount exceeds total amount");
  }
  const canceledLiability = totalBefore - releasedBefore;
  const beneficiaryBalanceBefore = await waitForWorkflowReadback(
    () => tokenomics.tokenBalanceOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.beneficiary],
    }),
    (result) => result.statusCode === 200,
    "revokeBeneficiaryVesting.beneficiaryBalanceBefore",
  );
  const totalSupplyBefore = await waitForWorkflowReadback(
    () => tokenomics.totalSupply({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200,
    "revokeBeneficiaryVesting.totalSupplyBefore",
  );
  const beneficiaryBalanceBeforeValue = readBigInt(beneficiaryBalanceBefore.body);
  const totalSupplyBeforeValue = readBigInt(totalSupplyBefore.body);
  const revoke = await tokenomics.revokeVestingSchedule({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.beneficiary],
  }).catch(async (error: unknown) => {
    const [beneficiaryBalanceAfterFailure, totalSupplyAfterFailure] = await Promise.all([
      tokenomics.tokenBalanceOf({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.beneficiary],
      }),
      tokenomics.totalSupply({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
    ]);
    assertNoEconomicSideEffects("revokeBeneficiaryVesting.failedWrite", {
      beneficiaryBalance: beneficiaryBalanceBeforeValue,
      totalSupply: totalSupplyBeforeValue,
    }, {
      beneficiaryBalance: readBigInt(beneficiaryBalanceAfterFailure.body),
      totalSupply: readBigInt(totalSupplyAfterFailure.body),
    });
    throw normalizeRevokeVestingExecutionError(error);
  });
  const revokeTxHash = await waitForWorkflowWriteReceipt(context, revoke.body, "revokeBeneficiaryVesting.revoke");
  const revokeReceipt = revokeTxHash ? await readWorkflowReceipt(context, revokeTxHash, "revokeBeneficiaryVesting.revoke") : null;
  const revokeEvents = revokeReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.vestingScheduleRevokedEventQuery({
          auth,
          fromBlock: BigInt(revokeReceipt.blockNumber),
          toBlock: BigInt(revokeReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, revokeTxHash),
        "revokeBeneficiaryVesting.vestingScheduleRevoked",
      )
    : [];
  const after = await waitForWorkflowReadback(
    () => readVestingState(tokenomics, auth, walletAddress, body.beneficiary).then((state) => ({
      statusCode: 200,
      body: state,
    })),
    (result) => isVestingScheduleRevoked((result.body as Awaited<ReturnType<typeof readVestingState>>).schedule.body),
    "revokeBeneficiaryVesting.readback",
  );
  const afterState = after.body as Awaited<ReturnType<typeof readVestingState>>;
  const revokedNow = extractRevokedAmountFromLogs(revokeEvents, revokeTxHash);
  if (revokeEvents.length > 0 && revokedNow === null) {
    throw new Error("revokeBeneficiaryVesting economic invariant failed: revocation event is missing revokedAmount");
  }
  const revokedAmount = revokedNow === null ? canceledLiability : readBigInt(revokedNow);
  const beneficiaryBalanceAfter = await waitForWorkflowReadback(
    () => tokenomics.tokenBalanceOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.beneficiary],
    }),
    (result) => result.statusCode === 200 && readBigInt(result.body) === beneficiaryBalanceBeforeValue,
    "revokeBeneficiaryVesting.beneficiaryBalanceAfter",
  );
  const totalSupplyAfter = await waitForWorkflowReadback(
    () => tokenomics.totalSupply({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200 && readBigInt(result.body) === totalSupplyBeforeValue,
    "revokeBeneficiaryVesting.totalSupplyAfter",
  );
  const canceledLiabilityDelta = assertExactAmountDelta(
    "revokeBeneficiaryVesting.canceledLiability",
    0n,
    revokedAmount,
    canceledLiability,
  );
  const beneficiaryBalanceDelta = assertExactAmountDelta(
    "revokeBeneficiaryVesting.beneficiaryBalance",
    beneficiaryBalanceBeforeValue,
    readBigInt(beneficiaryBalanceAfter.body),
    0n,
  );
  const totalSupplyDelta = assertExactAmountDelta(
    "revokeBeneficiaryVesting.totalSupply",
    totalSupplyBeforeValue,
    readBigInt(totalSupplyAfter.body),
    0n,
  );
  const scheduleTotalDelta = assertExactAmountDelta(
    "revokeBeneficiaryVesting.scheduleTotal",
    totalBefore,
    getTotalAmount(afterState.schedule.body),
    0n,
  );
  const releasedDelta = assertExactAmountDelta(
    "revokeBeneficiaryVesting.released",
    releasedBefore,
    getReleasedAmount(afterState.schedule.body),
    0n,
  );

  return {
    revoke: {
      submission: revoke.body,
      txHash: revokeTxHash,
      eventCount: revokeEvents.length,
      revokedAmount: revokedAmount.toString(),
    },
    economics: {
      canceledLiability: canceledLiabilityDelta,
      beneficiaryBalance: beneficiaryBalanceDelta,
      totalSupply: totalSupplyDelta,
      scheduleTotal: scheduleTotalDelta,
      released: releasedDelta,
    },
    vesting: {
      before: {
        exists: before.exists.body,
        schedule: before.schedule.body,
        details: before.details.body,
      },
      after: {
        exists: afterState.exists.body,
        schedule: afterState.schedule.body,
        details: afterState.details.body,
      },
    },
    summary: {
      beneficiary: body.beneficiary,
      revokedAfter: isVestingScheduleRevoked(afterState.schedule.body),
    },
  };
}
