import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import {
  asRecord,
  readListingWithStabilization,
  readMarketplaceEscrowState,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./marketplace-listing-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const cancelMarketplaceListingSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
});

export async function runCancelMarketplaceListingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof cancelMarketplaceListingSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const before = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => result.statusCode === 200,
    "cancelMarketplaceListing.before",
  );
  const cancel = await marketplace.cancelListing({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.tokenId],
  });
  const cancelTxHash = await waitForWorkflowWriteReceipt(context, cancel.body, "cancelMarketplaceListing.cancel");
  const cancelReceipt = cancelTxHash ? await readWorkflowReceipt(context, cancelTxHash, "cancelMarketplaceListing.cancel") : null;
  const after = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => {
      const listing = asRecord(result.body);
      return result.statusCode === 200 && listing?.isActive === false;
    },
    "cancelMarketplaceListing.after",
  );
  const escrow = await waitForWorkflowReadback(
    () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
    (result) => result.statusCode === 200,
    "cancelMarketplaceListing.escrow",
  );
  const events = cancelReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.listingCancelledEventQuery({
          auth,
          fromBlock: BigInt(cancelReceipt.blockNumber),
          toBlock: BigInt(cancelReceipt.blockNumber),
        }),
        (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === cancelTxHash),
        "cancelMarketplaceListing.listingCancelled",
      )
    : [];

  return {
    listing: {
      before: before.body,
      submission: cancel.body,
      txHash: cancelTxHash,
      after: after.body,
      eventCount: events.length,
    },
    escrow: escrow.body,
    summary: {
      tokenId: body.tokenId,
      activeAfter: false,
    },
  };
}
