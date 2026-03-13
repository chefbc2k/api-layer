import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { createVoiceAssetsPrimitiveService } from "../modules/voice-assets/primitives/generated/index.js";
import {
  readListingWithStabilization,
  readMarketplaceEscrowState,
  readOwnerOf,
} from "./marketplace-listing-helpers.js";
import { readMarketplacePaymentConfig, readPendingPaymentsSnapshot } from "./marketplace-payment-helpers.js";
import {
  asRecord,
  hasTransactionHash,
  normalizeAddress,
  readBigInt,
  readWorkflowReceipt,
  resolveWorkflowAccountAddress,
  waitForWorkflowEventQuery,
  waitForWorkflowReadback,
} from "./reward-campaign-helpers.js";
import { waitForWorkflowWriteReceipt } from "./wait-for-write.js";

export const purchaseMarketplaceAssetSchema = z.object({
  tokenId: z.string().regex(/^\d+$/u),
});

export async function runPurchaseMarketplaceAssetWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof purchaseMarketplaceAssetSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const voiceAssets = createVoiceAssetsPrimitiveService(context);
  const buyer = await resolveWorkflowAccountAddress(context, auth, walletAddress, "purchaseMarketplaceAsset");
  const paymentConfig = await readMarketplacePaymentConfig(marketplace, auth, walletAddress);

  if (paymentConfig.marketplacePaused === true) {
    throw new Error("purchase-marketplace-asset requires marketplace to be unpaused");
  }
  if (paymentConfig.paymentPaused === true) {
    throw new Error("purchase-marketplace-asset requires payments to be unpaused");
  }

  const listingBefore = await waitForWorkflowReadback(
    () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
    (result) => {
      const listing = asRecord(result.body);
      return result.statusCode === 200 && listing?.isActive === true;
    },
    "purchaseMarketplaceAsset.listingBefore",
  );
  const listingRecord = asRecord(listingBefore.body);
  const seller = normalizeAddress(listingRecord?.seller);
  if (!seller) {
    throw new Error("purchase-marketplace-asset requires seller address in listing readback");
  }

  const [ownerBefore, escrowBefore, assetRevenueBefore, revenueMetricsBefore, pendingBefore] = await Promise.all([
    waitForWorkflowReadback(
      () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
      (result) => result.statusCode === 200 && typeof result.body === "string",
      "purchaseMarketplaceAsset.ownerBefore",
    ),
    waitForWorkflowReadback(
      () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.escrowBefore",
    ),
    waitForWorkflowReadback(
      () => marketplace.getAssetRevenue({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.tokenId],
      }),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.assetRevenueBefore",
    ),
    waitForWorkflowReadback(
      () => marketplace.getRevenueMetrics({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.revenueMetricsBefore",
    ),
    waitForWorkflowReadback(
      () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, {
        seller,
        treasury: paymentConfig.treasury,
        devFund: paymentConfig.devFund,
        unionTreasury: paymentConfig.unionTreasury,
      }).then((snapshot) => ({ statusCode: 200, body: snapshot })),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.pendingBefore",
    ),
  ]);

  const purchase = await marketplace.purchaseAsset({
    auth,
    api: { executionSource: "auto", gaslessMode: "none" },
    walletAddress,
    wireParams: [body.tokenId],
  }).catch((error: unknown) => {
    throw normalizePurchaseExecutionError(error, body.tokenId);
  });
  const purchaseTxHash = await waitForWorkflowWriteReceipt(context, purchase.body, "purchaseMarketplaceAsset.purchase");
  const purchaseReceipt = purchaseTxHash ? await readWorkflowReceipt(context, purchaseTxHash, "purchaseMarketplaceAsset.purchase") : null;

  const [listingAfter, ownerAfter, escrowAfter, assetRevenueAfter, revenueMetricsAfter, pendingAfter] = await Promise.all([
    waitForWorkflowReadback(
      () => readListingWithStabilization(marketplace, auth, walletAddress, body.tokenId).then((result) => result ?? { statusCode: 500, body: null }),
      (result) => {
        const listing = asRecord(result.body);
        return result.statusCode === 200 && listing?.isActive === false;
      },
      "purchaseMarketplaceAsset.listingAfter",
    ),
    waitForWorkflowReadback(
      () => readOwnerOf(voiceAssets, auth, walletAddress, body.tokenId),
      (result) => result.statusCode === 200 && normalizeAddress(result.body) === normalizeAddress(buyer),
      "purchaseMarketplaceAsset.ownerAfter",
    ),
    waitForWorkflowReadback(
      () => readMarketplaceEscrowState(marketplace, auth, walletAddress, body.tokenId).then((state) => ({ statusCode: 200, body: state })),
      (result) => {
        const state = result.body as { inEscrow: unknown };
        return state.inEscrow === false || state.inEscrow === null;
      },
      "purchaseMarketplaceAsset.escrowAfter",
    ),
    waitForWorkflowReadback(
      () => marketplace.getAssetRevenue({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [body.tokenId],
      }),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.assetRevenueAfter",
    ),
    waitForWorkflowReadback(
      () => marketplace.getRevenueMetrics({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.revenueMetricsAfter",
    ),
    waitForWorkflowReadback(
      () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, {
        seller,
        treasury: paymentConfig.treasury,
        devFund: paymentConfig.devFund,
        unionTreasury: paymentConfig.unionTreasury,
      }).then((snapshot) => ({ statusCode: 200, body: snapshot })),
      (result) => result.statusCode === 200,
      "purchaseMarketplaceAsset.pendingAfter",
    ),
  ]);

  const assetPurchasedEvents = purchaseReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.assetPurchasedEventQuery({
          auth,
          fromBlock: BigInt(purchaseReceipt.blockNumber),
          toBlock: BigInt(purchaseReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, purchaseTxHash),
        "purchaseMarketplaceAsset.assetPurchased",
      )
    : [];
  const paymentDistributedEvents = purchaseReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.paymentDistributedEventQuery({
          auth,
          fromBlock: BigInt(purchaseReceipt.blockNumber),
          toBlock: BigInt(purchaseReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, purchaseTxHash),
        "purchaseMarketplaceAsset.paymentDistributed",
      )
    : [];
  const assetReleasedEvents = purchaseReceipt
    ? await waitForWorkflowEventQuery(
        () => marketplace.assetReleasedEventQuery({
          auth,
          fromBlock: BigInt(purchaseReceipt.blockNumber),
          toBlock: BigInt(purchaseReceipt.blockNumber),
        }),
        (logs) => hasTransactionHash(logs, purchaseTxHash),
        "purchaseMarketplaceAsset.assetReleased",
      )
    : [];

  return {
    preflight: {
      buyer,
      buyerFunding: {
        source: "externally-managed-usdc-precondition",
        paymentToken: paymentConfig.paymentToken,
        allowanceRead: null,
        balanceRead: null,
      },
      marketplacePaused: paymentConfig.marketplacePaused,
      paymentPaused: paymentConfig.paymentPaused,
      listing: listingBefore.body,
      escrow: escrowBefore.body,
      ownerBefore: ownerBefore.body,
    },
    purchase: {
      submission: purchase.body,
      txHash: purchaseTxHash,
      listingAfter: listingAfter.body,
      ownerAfter: ownerAfter.body,
      escrowAfter: escrowAfter.body,
      eventCount: {
        assetPurchased: assetPurchasedEvents.length,
        paymentDistributed: paymentDistributedEvents.length,
        assetReleased: assetReleasedEvents.length,
      },
    },
    settlement: {
      payees: {
        seller,
        treasury: paymentConfig.treasury,
        devFund: paymentConfig.devFund,
        unionTreasury: paymentConfig.unionTreasury,
      },
      pendingBefore: pendingBefore.body,
      pendingAfter: pendingAfter.body,
      pendingDelta: diffPendingSnapshots(
        pendingBefore.body as Record<string, unknown>,
        pendingAfter.body as Record<string, unknown>,
      ),
      assetRevenueBefore: assetRevenueBefore.body,
      assetRevenueAfter: assetRevenueAfter.body,
      revenueMetricsBefore: revenueMetricsBefore.body,
      revenueMetricsAfter: revenueMetricsAfter.body,
    },
    summary: {
      tokenId: body.tokenId,
      buyer,
      seller,
      listingActiveAfter: false,
      fundingInspection: "external-usdc-precondition",
    },
  };
}

function diffPendingSnapshots(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return {
    seller: diffPendingValue(before.seller, after.seller),
    treasury: diffPendingValue(before.treasury, after.treasury),
    devFund: diffPendingValue(before.devFund, after.devFund),
    unionTreasury: diffPendingValue(before.unionTreasury, after.unionTreasury),
  };
}

function normalizePurchaseExecutionError(error: unknown, tokenId: string): unknown {
  const text = collectErrorText(error).toLowerCase();
  if (text.includes("assettoonew") || text.includes("0x0d9482a2")) {
    return new HttpError(409, `purchase-marketplace-asset blocked by asset age: token ${tokenId} is still within the contract's 1 day trading lock`, extractDiagnostics(error));
  }
  if (text.includes("tradinglocked") || text.includes("0xe032e6fb")) {
    return new HttpError(409, `purchase-marketplace-asset blocked by trading lock for token ${tokenId}`, extractDiagnostics(error));
  }
  if (text.includes("insufficientallowance") || text.includes("0x13be252b")) {
    return new HttpError(409, "purchase-marketplace-asset requires buyer payment-token allowance as an external precondition", extractDiagnostics(error));
  }
  if (text.includes("insufficientpayment") || text.includes("insufficientbalance") || text.includes("0xcd1c8867") || text.includes("0xf4d678b8")) {
    return new HttpError(409, "purchase-marketplace-asset requires buyer payment-token funding as an external precondition", extractDiagnostics(error));
  }
  return error;
}

function collectErrorText(error: unknown): string {
  const parts = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      parts.add(String(value));
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }
    for (const nested of Object.values(value as Record<string, unknown>)) {
      visit(nested);
    }
  };
  visit((error as { message?: unknown })?.message ?? error);
  visit((error as { diagnostics?: unknown })?.diagnostics);
  return Array.from(parts).join(" ");
}

function extractDiagnostics(error: unknown): unknown {
  return (error as { diagnostics?: unknown })?.diagnostics;
}

function diffPendingValue(before: unknown, after: unknown): string | null {
  if (before === null || after === null || before === undefined || after === undefined) {
    return null;
  }
  return String(readBigInt(after) - readBigInt(before));
}
