import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createTokenomicsPrimitiveService } from "../modules/tokenomics/primitives/generated/index.js";
import {
  extractReleasedAmount,
  extractReleasedAmountFromLogs,
  getReleasedAmount,
  getReleasableFromSummary,
  readBigInt,
  readVestingState,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
  hasTransactionHash,
  normalizeReleaseVestingExecutionError,
} from "./vesting-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";
import { assertExactAmountDelta } from "./economic-invariants.js";

export const releaseBeneficiaryVestingSchema = z.object({
  beneficiary: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  mode: z.enum(["self", "for"]).default("for"),
});

export async function runReleaseBeneficiaryVestingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof releaseBeneficiaryVestingSchema>,
) {
  const tokenomics = createTokenomicsPrimitiveService(context);
  const before = await readVestingState(tokenomics, auth, walletAddress, body.beneficiary);
  const releasedBefore = getReleasedAmount(before.schedule.body);
  const releasableBefore = readBigInt(before.releasable.body);
  const beneficiaryBalanceBefore = await waitForWorkflowReadback(
    () => tokenomics.tokenBalanceOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.beneficiary],
    }),
    (result) => result.statusCode === 200,
    "releaseBeneficiaryVesting.beneficiaryBalanceBefore",
  );
  const totalSupplyBefore = await waitForWorkflowReadback(
    () => tokenomics.totalSupply({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200,
    "releaseBeneficiaryVesting.totalSupplyBefore",
  );
  const beneficiaryBalanceBeforeValue = readBigInt(beneficiaryBalanceBefore.body);
  const totalSupplyBeforeValue = readBigInt(totalSupplyBefore.body);

  const releaseOperation = body.mode === "self"
    ? tokenomics.releaseStandardVesting({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      })
    : tokenomics.releaseStandardVestingFor({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.beneficiary],
      });
  const release = await releaseOperation.catch((error: unknown) => {
    throw normalizeReleaseVestingExecutionError(error);
  });
  const releaseTxHash = await waitForWorkflowWriteReceipt(context, release.body, `releaseBeneficiaryVesting.${body.mode}`);
  const releaseReceipt = releaseTxHash ? await readWorkflowReceipt(context, releaseTxHash, `releaseBeneficiaryVesting.${body.mode}`) : null;
  const releaseEvents = releaseReceipt
    ? await waitForWorkflowEventQuery(
        () => tokenomics.tokensReleasedEventQuery({
          auth,
          fromBlock: BigInt(releaseReceipt.blockNumber),
          toBlock: BigInt(releaseReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, releaseTxHash),
        "releaseBeneficiaryVesting.tokensReleased",
      )
    : [];

  const releasedNow = extractReleasedAmountFromLogs(releaseEvents, releaseTxHash) ?? extractReleasedAmount(release.body);
  const releasedNowValue = releasedNow === null ? null : readBigInt(releasedNow);

  const after = await waitForWorkflowReadback(
    () => readVestingState(tokenomics, auth, walletAddress, body.beneficiary).then((state) => ({
      statusCode: 200,
      body: state,
    })),
    (result) => {
      const state = result.body as Awaited<ReturnType<typeof readVestingState>>;
      const releasedAfter = getReleasedAmount(state.schedule.body);
      const releasableAfter = readBigInt(state.releasable.body);
      const releasedEnough = releasedNowValue === null
        ? releasedAfter > releasedBefore
        : releasedAfter === releasedBefore + releasedNowValue;
      return releasedEnough && releasableAfter <= releasableBefore;
    },
    "releaseBeneficiaryVesting.readback",
  );
  const afterState = after.body as Awaited<ReturnType<typeof readVestingState>>;
  const releasedAfter = getReleasedAmount(afterState.schedule.body);
  const effectiveReleaseAmount = releasedNowValue ?? (releasedAfter - releasedBefore);
  if (effectiveReleaseAmount <= 0n) {
    throw new Error("releaseBeneficiaryVesting economic invariant failed: release amount must be positive");
  }
  const beneficiaryBalanceAfter = await waitForWorkflowReadback(
    () => tokenomics.tokenBalanceOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.beneficiary],
    }),
    (result) => result.statusCode === 200 && readBigInt(result.body) === beneficiaryBalanceBeforeValue + effectiveReleaseAmount,
    "releaseBeneficiaryVesting.beneficiaryBalanceAfter",
  );
  const totalSupplyAfter = await waitForWorkflowReadback(
    () => tokenomics.totalSupply({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    (result) => result.statusCode === 200 && readBigInt(result.body) === totalSupplyBeforeValue,
    "releaseBeneficiaryVesting.totalSupplyAfter",
  );
  const releasedDelta = assertExactAmountDelta(
    "releaseBeneficiaryVesting.released",
    releasedBefore,
    releasedAfter,
    effectiveReleaseAmount,
  );
  const beneficiaryBalanceDelta = assertExactAmountDelta(
    "releaseBeneficiaryVesting.beneficiaryBalance",
    beneficiaryBalanceBeforeValue,
    readBigInt(beneficiaryBalanceAfter.body),
    effectiveReleaseAmount,
  );
  const totalSupplyDelta = assertExactAmountDelta(
    "releaseBeneficiaryVesting.totalSupply",
    totalSupplyBeforeValue,
    readBigInt(totalSupplyAfter.body),
    0n,
  );

  return {
    release: {
      submission: release.body,
      txHash: releaseTxHash,
      releasedNow,
      eventCount: releaseEvents.length,
      mode: body.mode,
    },
    vesting: {
      before: {
        schedule: before.schedule.body,
        releasable: before.releasable.body,
        totals: before.totals.body,
      },
      after: {
        schedule: afterState.schedule.body,
        releasable: afterState.releasable.body,
        totals: afterState.totals.body,
      },
    },
    economics: {
      released: releasedDelta,
      beneficiaryBalance: beneficiaryBalanceDelta,
      totalSupply: totalSupplyDelta,
    },
    summary: {
      beneficiary: body.beneficiary,
      mode: body.mode,
      releasableBefore: String(releasableBefore),
      releasableAfter: String(getReleasableFromSummary(afterState.totals.body)),
    },
  };
}
