import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createGovernancePrimitiveService } from "../modules/governance/primitives/generated/index.js";

export const submitProposalAndVoteSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  targets: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/u)),
  values: z.array(z.string().regex(/^\d+$/u)),
  calldatas: z.array(z.string().regex(/^0x[0-9a-fA-F]*$/u)),
  proposalType: z.number().int().nonnegative(),
  support: z.number().int().nonnegative(),
  reason: z.string().default("workflow vote"),
});

export async function runSubmitProposalAndVoteWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof submitProposalAndVoteSchema>,
) {
  const governance = createGovernancePrimitiveService(context);
  const proposal = body.title
    ? await governance.proposeStringStringAddressArrayUint256ArrayBytesArrayUint8({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.title, body.description, body.targets, body.values, body.calldatas, body.proposalType],
      })
    : await governance.proposeAddressArrayUint256ArrayBytesArrayStringUint8({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.targets, body.values, body.calldatas, body.description, body.proposalType],
      });
  const proposalId = proposal.body && typeof proposal.body === "object" && "result" in (proposal.body as Record<string, unknown>)
    ? ((proposal.body as Record<string, unknown>).result as string | null)
    : null;
  const vote = proposalId
    ? await governance.prCastVote({
        auth,
        api: { executionSource: "auto", gaslessMode: "cdpSmartWallet" },
        walletAddress,
        wireParams: [proposalId, body.support, body.reason],
      })
    : null;
  return {
    proposal: proposal.body,
    vote: vote?.body ?? null,
    proposalId,
  };
}
