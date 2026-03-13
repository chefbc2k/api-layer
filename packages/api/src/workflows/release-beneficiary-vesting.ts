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
} from "./vesting-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

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

  const release = body.mode === "self"
    ? await tokenomics.releaseStandardVesting({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      })
    : await tokenomics.releaseStandardVestingFor({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.beneficiary],
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

  const releasedNow = extractReleasedAmount(release.body) ?? extractReleasedAmountFromLogs(releaseEvents, releaseTxHash);
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
        : releasedAfter >= releasedBefore + releasedNowValue;
      return releasedEnough && releasableAfter <= releasableBefore;
    },
    "releaseBeneficiaryVesting.readback",
  );
  const afterState = after.body as Awaited<ReturnType<typeof readVestingState>>;

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
    summary: {
      beneficiary: body.beneficiary,
      mode: body.mode,
      releasableBefore: String(releasableBefore),
      releasableAfter: String(getReleasableFromSummary(afterState.totals.body)),
    },
  };
}
