import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createStakingPrimitiveService } from "../modules/staking/primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const stakeAndDelegateSchema = z.object({
  amount: z.string().regex(/^\d+$/u),
  delegatee: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

export async function runStakeAndDelegateWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof stakeAndDelegateSchema>,
) {
  const staking = createStakingPrimitiveService(context);
  const stake = await staking.stake({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.amount],
  });
  await waitForWorkflowWriteReceipt(context, stake.body, "stakeAndDelegate.stake");
  const delegation = await staking.delegate({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.delegatee],
  });
  await waitForWorkflowWriteReceipt(context, delegation.body, "stakeAndDelegate.delegate");
  return {
    stake: stake.body,
    delegation: delegation.body,
  };
}
