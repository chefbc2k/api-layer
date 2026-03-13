import { z } from "zod";

import type { ApiExecutionContext } from "../../../shared/execution-context.js";
import type { RouteResult } from "../../../shared/route-types.js";
import { createVoiceAssetsPrimitiveService } from "../primitives/generated/index.js";
import { waitForWorkflowWriteReceipt } from "../../../workflows/wait-for-write.js";

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
  const transferMode = body.safe ? (body.data ? "safe-with-data" : "safe") : "transfer";
  let transfer;
  if (body.safe && body.data) {
    transfer = await voiceAssets.safeTransferFromAddressAddressUint256Bytes({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.from, body.to, body.tokenId, body.data],
    });
  } else if (body.safe) {
    transfer = await voiceAssets.safeTransferFromAddressAddressUint256({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.from, body.to, body.tokenId],
    });
  } else {
    transfer = await voiceAssets.transferFromVoiceAsset({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.from, body.to, body.tokenId],
    });
  }

  const transferTxHash = await waitForWorkflowWriteReceipt(context, transfer.body, `transferRights.${transferMode}`);
  const ownerRead = await waitForWorkflowReadback(
    () => voiceAssets.ownerOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.tokenId],
    }),
    (result) => result.statusCode === 200 && normalizeAddress(result.body) === normalizeAddress(body.to),
    `transferRights.ownerOf.${body.tokenId}`,
  );

  return {
    transfer: {
      mode: transferMode,
      submission: transfer.body,
      txHash: transferTxHash,
      owner: ownerRead.body,
    },
    summary: {
      from: body.from,
      to: body.to,
      tokenId: body.tokenId,
      safe: body.safe,
      hasData: Boolean(body.data),
    },
  };
}

async function waitForWorkflowReadback(
  read: () => Promise<RouteResult>,
  ready: (result: RouteResult) => boolean,
  label: string,
) {
  let lastResult: RouteResult | null = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await read();
    lastResult = result;
    if (ready(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} readback timeout: ${JSON.stringify(lastResult?.body ?? null)}`);
}

function normalizeAddress(value: unknown): string | null {
  return typeof value === "string" ? value.toLowerCase() : null;
}
