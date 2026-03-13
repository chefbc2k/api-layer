import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import { readListingWithStabilization, readMarketplaceEscrowState, safeReadRoute } from "./marketplace-listing-helpers.js";

export const inspectMarketplaceListingSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
});

export async function runInspectMarketplaceListingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof inspectMarketplaceListingSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const [listing, escrow, owner] = await Promise.all([
    readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId),
    readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId),
    safeReadRoute(() => voiceAssets.ownerOf({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [body.tokenId],
    })),
  ]);

  return {
    listing: listing?.body ?? null,
    escrow,
    ownership: {
      owner: owner?.body ?? null,
    },
    summary: {
      tokenId: body.tokenId,
      hasListing: listing?.statusCode === 200,
      inEscrow: escrow.inEscrow === true,
    },
  };
}
