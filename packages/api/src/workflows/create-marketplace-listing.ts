import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import {
  asRecord,
  normalizeAddress,
  readListingWithStabilization,
  readMarketplaceEscrowState,
  readOwnerOf,
  readWorkflowReceipt,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./marketplace-listing-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const createMarketplaceListingSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
  price: z.string().regex(/^\d+$/u),
  duration: z.string().regex(/^\d+$/u),
});

export async function runCreateMarketplaceListingWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof createMarketplaceListingSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const ownerBefore = await waitForWorkflowReadback(
    () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
    (result) => result.statusCode === 200 && typeof result.body === "string",
    "createMarketplaceListing.ownerBefore",
  );
  const seller = String(ownerBefore.body);
  const operator = context.addressBook.toJSON().diamond;
  const approvalBefore = await waitForWorkflowReadback(
    () => voiceAssets.isApprovedForAll({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [seller, operator],
    }),
    (result) => result.statusCode === 200,
    "createMarketplaceListing.approvalBefore",
  );

  let approvalSubmission: unknown = null;
  let approvalTxHash: string | null = null;
  let approvalAfter = approvalBefore.body;
  if (approvalBefore.body !== true) {
    const approval = await voiceAssets.setApprovalForAll({
      auth,
      api: { executionSource: "auto", gaslessMode: "none" },
      walletAddress,
      wireParams: [operator, true],
    });
    approvalSubmission = approval.body;
    approvalTxHash = await waitForWorkflowWriteReceipt(context, approval.body, "createMarketplaceListing.approval");
    const approvalRead = await waitForWorkflowReadback(
      () => voiceAssets.isApprovedForAll({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [seller, operator],
      }),
      (result) => result.statusCode === 200 && result.body === true,
      "createMarketplaceListing.approvalAfter",
    );
    approvalAfter = approvalRead.body;
  }

  const listing = await marketplace.listAsset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.tokenId, body.price, body.duration],
  });
  const listingTxHash = await waitForWorkflowWriteReceipt(context, listing.body, "createMarketplaceListing.list");
  const listingReceipt = listingTxHash ? await readWorkflowReceipt(context, listingTxHash, "createMarketplaceListing.list") : null;
  const listingRead = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => {
      const record = asRecord(result.body);
      return result.statusCode === 200
        && record?.tokenId === body.tokenId
        && record?.price === body.price
        && record?.isActive === true;
    },
    "createMarketplaceListing.listingRead",
  );
  const escrowRead = await waitForWorkflowReadback(
    () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({
      statusCode: 200,
      body: state,
    })),
    (result) => {
      const state = result.body as { originalOwner: unknown; inEscrow: unknown };
      return state.inEscrow === true && normalizeAddress(state.originalOwner) === normalizeAddress(seller);
    },
    "createMarketplaceListing.escrowRead",
  );
  const ownerAfter = await waitForWorkflowReadback(
    () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
    (result) => result.statusCode === 200 && typeof result.body === "string",
    "createMarketplaceListing.ownerAfter",
  );

  const listedEvents = listingReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.assetListedEventQuery({
          auth,
          fromBlock: BigInt(listingReceipt.blockNumber),
          toBlock: BigInt(listingReceipt.blockNumber),
        }),
        (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === listingTxHash),
        "createMarketplaceListing.assetListed",
      )
    : [];
  const escrowedEvents = listingReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.marketplaceAssetEscrowedEventQuery({
          auth,
          fromBlock: BigInt(listingReceipt.blockNumber),
          toBlock: BigInt(listingReceipt.blockNumber),
        }),
        (logs) => logs.some((entry) => asRecord(entry)?.transactionHash === listingTxHash),
        "createMarketplaceListing.assetEscrowed",
      )
    : [];

  return {
    ownership: {
      ownerBefore: ownerBefore.body,
      ownerAfter: ownerAfter.body,
      approval: {
        submission: approvalSubmission,
        txHash: approvalTxHash,
        approvedForAllBefore: approvalBefore.body,
        approvedForAllAfter: approvalAfter,
      },
    },
    listing: {
      submission: listing.body,
      txHash: listingTxHash,
      read: listingRead.body,
      eventCount: listedEvents.length,
    },
    escrow: {
      read: escrowRead.body,
      eventCount: escrowedEvents.length,
    },
    summary: {
      tokenId: body.tokenId,
      seller,
      price: body.price,
      duration: body.duration,
    },
  };
}
