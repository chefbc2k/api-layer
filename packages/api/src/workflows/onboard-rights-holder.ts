import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createAccessControlPrimitiveService } from "../modules/access-control/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";

export const onboardRightsHolderSchema = z.object({
  role: z.string().regex(/^0x[a-fA-F0-9]{64}$/u),
  account: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  expiryTime: z.string().regex(/^\d+$/u),
  voiceHashes: z.array(z.string().regex(/^0x[a-fA-F0-9]{64}$/u)).default([]),
});

export async function runOnboardRightsHolderWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof onboardRightsHolderSchema>,
) {
  const access = createAccessControlPrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const roleGrant = await access.grantRole({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.role, body.account, body.expiryTime],
  });
  const authorizations = await Promise.all(body.voiceHashes.map((voiceHash) =>
    voiceAssets.authorizeUser({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [voiceHash, body.account],
    }),
  ));
  return {
    roleGrant: roleGrant.body,
    authorizations: authorizations.map((entry) => entry.body),
  };
}
