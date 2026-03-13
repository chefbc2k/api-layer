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

export const updateMarketplaceListingPriceSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
  newPrice: z.string().regex(/^\d+$/u),
});

export async function runUpdateMarketplaceListingPriceWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof updateMarketplaceListingPriceSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const before = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => result.statusCode === 200,
    "updateMarketplaceListingPrice.before",
  );
  const update = await marketplace.updateListingPrice({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.tokenId, body.newPrice],
  });
  const updateTxHash = await waitForWorkflowWriteReceipt(context, update.body, "updateMarketplaceListingPrice.update");
  const updateReceipt = updateTxHash ? await readWorkflowReceipt(context, updateTxHash, "updateMarketplaceListingPrice.update") : null;
  const after = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => {
      const listing = asRecord(result.body);
      return result.statusCode === 200 && listing?.price === body.newPrice;
    },
    "updateMarketplaceListingPrice.after",
  );
  const escrow = await waitForWorkflowReadback(
    () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
    (result) => result.statusCode === 200,
    "updateMarketplaceListingPrice.escrow",
  );
  const events = updateReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.listingPriceUpdatedEventQuery({
          auth,
          fromBlock: BigInt(updateReceipt.blockNumber),
          toBlock: BigInt(updateReceipt.blockNumber),
        }),
        (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === updateTxHash),
        "updateMarketplaceListingPrice.priceUpdated",
      )
    : [];

  return {
    listing: {
      before: before.body,
      submission: update.body,
      txHash: updateTxHash,
      after: after.body,
      eventCount: events.length,
    },
    escrow: escrow.body,
    summary: {
      tokenId: body.tokenId,
      newPrice: body.newPrice,
    },
  };
}
