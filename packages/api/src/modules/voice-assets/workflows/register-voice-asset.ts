import { z } from "zod";

import type { ApiExecutionContext } from "../../../shared/execution-context.js";
import { createVoiceAssetsPrimitiveService } from "../primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "../../../workflows/wait-for-write.js";

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
  const registrationTxHash = await waitForWorkflowWriteReceipt(context, registration.body, "registerVoiceAsset.registration");

  const voiceHash = registration.body && typeof registration.body === "object" && "result" in (registration.body as Record<string, unknown>)
    ? ((registration.body as Record<string, unknown>).result as string | null)
    : null;
  const registrationRead = voiceHash
    ? await waitForWorkflowReadback(
        () => voiceAssets.getVoiceAsset({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [voiceHash],
        }),
        (result) => result.statusCode === 200,
        "registerVoiceAsset.registrationRead",
      )
    : null;

  let metadataUpdate: import("../../../shared/route-types.js").RouteResult | null = null;
  let metadataUpdateTxHash: string | null = null;
  let featuresRead: import("../../../shared/route-types.js").RouteResult | null = null;

  if (voiceHash && body.features) {
    metadataUpdate = await voiceAssets.updateBasicAcousticFeatures({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [voiceHash, body.features],
    });
    metadataUpdateTxHash = await waitForWorkflowWriteReceipt(context, metadataUpdate.body, "registerVoiceAsset.metadataUpdate");
    featuresRead = await waitForWorkflowReadback(
      () => voiceAssets.getBasicAcousticFeatures({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [voiceHash],
      }),
      (result) => JSON.stringify(result.body) === JSON.stringify(body.features),
      "registerVoiceAsset.featuresRead",
    );
  }

  return {
    registration: {
      submission: registration.body,
      txHash: registrationTxHash,
      voiceAsset: registrationRead?.body ?? null,
    },
    metadataUpdate: metadataUpdate
      ? {
          submission: metadataUpdate.body,
          txHash: metadataUpdateTxHash,
          features: featuresRead?.body ?? null,
        }
      : null,
    voiceHash,
    summary: {
      owner: body.owner ?? null,
      hasFeatures: Boolean(body.features),
    },
  };
}

async function waitForWorkflowReadback(
  read: () => Promise<import("../../../shared/route-types.js").RouteResult>,
  ready: (result: import("../../../shared/route-types.js").RouteResult) => boolean,
  label: string,
) {
  let lastResult: import("../../../shared/route-types.js").RouteResult | null = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await read();
    lastResult = result;
    if (ready(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastResult?.body ?? null)}`);
}
