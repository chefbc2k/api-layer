import { z } from "zod";

import type { ApiExecutionContext } from "../../../shared/execution-context.js";
import { createVoiceAssetsPrimitiveService } from "../primitives/generated/index.js";

export const transferRightsWorkflowSchema = z.object({
  from: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
  tokenId: z.string().regex(/^\d+$/u),
  safe: z.boolean().default(false),
  data: z.string().regex(/^0x[0-9a-fA-F]*$/u).optional(),
});

export async function runTransferRightsWorkflow(
  context: ApiExecutionContext,
  auth: import("../../../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof transferRightsWorkflowSchema>,
) {
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  if (body.safe && body.data) {
    return (await voiceAssets.safeTransferFromAddressAddressUint256Bytes({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.from, body.to, body.tokenId, body.data],
    })).body;
  }
  if (body.safe) {
    return (await voiceAssets.safeTransferFromAddressAddressUint256({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.from, body.to, body.tokenId],
    })).body;
  }
  return (await voiceAssets.transferFromVoiceAsset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.from, body.to, body.tokenId],
  })).body;
}
