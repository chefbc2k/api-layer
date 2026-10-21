import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import {
  asRecord,
  normalizeAddress,
  readMarketplaceEscrowState,
  readOwnerOf,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./marketplace-listing-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const releaseEscrowedAssetSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/u),
});

type EscrowEconomicSnapshot = {
  owner: string;
  assetState: string;
  originalOwner: string;
  inEscrow: string;
};

function normalizeStateValue(value: unknown): string {
  return normalizeAddress(value) ?? String(value);
}

function escrowEconomicSnapshot(owner: unknown, escrow: unknown): EscrowEconomicSnapshot {
  const state = asRecord(escrow);
  return {
    owner: normalizeStateValue(owner),
    assetState: normalizeStateValue(state?.assetState),
    originalOwner: normalizeStateValue(state?.originalOwner),
    inEscrow: normalizeStateValue(state?.inEscrow),
  };
}

function assertNoEscrowEconomicSideEffects(
  label: string,
  before: EscrowEconomicSnapshot,
  after: EscrowEconomicSnapshot,
): void {
  for (const key of Object.keys(before) as Array<keyof EscrowEconomicSnapshot>) {
    if (before[key] !== after[key]) {
      throw new Error(`${label} economic invariant failed: ${key} changed from ${before[key]} to ${after[key]}`);
    }
  }
}

export async function runReleaseEscrowedAssetWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof releaseEscrowedAssetSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const beforeEscrow = await waitForWorkflowReadback(
    () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
    (result) => result.statusCode === 200,
    "releaseEscrowedAsset.beforeEscrow",
  );
  const beforeOwner = await waitForWorkflowReadback(
    () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
    (result) => result.statusCode === 200 && typeof result.body === "string",
    "releaseEscrowedAsset.beforeOwner",
  );
  const beforeEconomicState = escrowEconomicSnapshot(beforeOwner.body, beforeEscrow.body);
  let release: Awaited<ReturnType<typeof marketplace.releaseAsset>>;
  let releaseTxHash: string | null;
  try {
    release = await marketplace.releaseAsset({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.tokenId, body.to],
    });
    releaseTxHash = await waitForWorkflowWriteReceipt(context, release.body, "releaseEscrowedAsset.release");
  } catch (error) {
    const failedOwner = await waitForWorkflowReadback(
      () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
      (result) => result.statusCode === 200,
      "releaseEscrowedAsset.failedOwner",
    );
    const failedEscrow = await waitForWorkflowReadback(
      () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
      (result) => result.statusCode === 200,
      "releaseEscrowedAsset.failedEscrow",
    );
    assertNoEscrowEconomicSideEffects(
      "releaseEscrowedAsset.failed",
      beforeEconomicState,
      escrowEconomicSnapshot(failedOwner.body, failedEscrow.body),
    );
    throw error;
  }
  const releaseReceipt = releaseTxHash ? await readWorkflowReceipt(context, releaseTxHash, "releaseEscrowedAsset.release") : null;
  const afterOwner = await waitForWorkflowReadback(
    () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
    (result) => result.statusCode === 200 && normalizeAddress(result.body) === normalizeAddress(body.to),
    "releaseEscrowedAsset.afterOwner",
  );
  const afterEscrow = await waitForWorkflowReadback(
    () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
    (result) => {
      const state = result.body as { inEscrow: unknown };
      return state.inEscrow === false || state.inEscrow === null;
    },
    "releaseEscrowedAsset.afterEscrow",
  );
  const events = releaseReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.assetReleasedEventQuery({
          auth,
          fromBlock: BigInt(releaseReceipt.blockNumber),
          toBlock: BigInt(releaseReceipt.blockNumber),
        }),
        (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === releaseTxHash),
        "releaseEscrowedAsset.assetReleased",
      )
    : [];

  return {
    ownership: {
      ownerBefore: beforeOwner.body,
      ownerAfter: afterOwner.body,
    },
    escrow: {
      before: beforeEscrow.body,
      after: afterEscrow.body,
      eventCount: events.length,
    },
    release: {
      submission: release.body,
      txHash: releaseTxHash,
    },
    summary: {
      tokenId: body.tokenId,
      to: body.to,
    },
  };
}
