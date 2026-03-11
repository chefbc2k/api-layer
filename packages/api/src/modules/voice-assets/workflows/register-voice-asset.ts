import { z } from "zod";

import type { ApiExecutionContext } from "../../../shared/execution-context.js";
import { createVoiceAssetsPrimitiveService } from "../primitives/generated/index.js";

export const registerVoiceAssetWorkflowSchema = z.object({
  ipfsHash: z.string(),
  royaltyRate: z.string().regex(/^\d+$/u),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/u).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
});

export async function runRegisterVoiceAssetWorkflow(
  context: ApiExecutionContext,
  auth: import("../../../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof registerVoiceAssetWorkflowSchema>,
) {
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const registration = body.owner
    ? await voiceAssets.registerVoiceAssetForCaller({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.ipfsHash, body.royaltyRate, body.owner],
      })
    : await voiceAssets.registerVoiceAsset({
        auth,
        api: { executionSource: "auto", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.ipfsHash, body.royaltyRate],
      });

  let metadataUpdate: import("../../../shared/route-types.js").RouteResult | null = null;
  const voiceHash = registration.body && typeof registration.body === "object" && "result" in (registration.body as Record<string, unknown>)
    ? ((registration.body as Record<string, unknown>).result as string | null)
    : null;

  if (voiceHash && body.features) {
    metadataUpdate = await voiceAssets.updateBasicAcousticFeatures({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [voiceHash, body.features],
    });
  }

  return {
    registration: registration.body,
    metadataUpdate: metadataUpdate?.body ?? null,
    voiceHash,
  };
}
