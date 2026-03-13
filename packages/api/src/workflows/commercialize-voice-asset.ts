import { z } from "zod";

import type { AuthContext } from "../shared/auth.js";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { HttpError } from "../shared/errors.js";
import { createDatasetAndListForSaleSchema, runCreateDatasetAndListForSaleWorkflow } from "./create-dataset-and-list-for-sale.js";
import { inspectMarketplaceListingSchema, runInspectMarketplaceListingWorkflow } from "./inspect-marketplace-listing.js";
import { purchaseMarketplaceAssetSchema, runPurchaseMarketplaceAssetWorkflow } from "./purchase-marketplace-asset.js";
import { runWithdrawMarketplacePaymentsWorkflow, withdrawMarketplacePaymentsSchema } from "./withdraw-marketplace-payments.js";

const actorOverrideSchema = z.object({
  apiKey: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/u).optional(),
});

export const commercializeVoiceAssetWorkflowSchema = z.object({
  packaging: createDatasetAndListForSaleSchema,
  inspectListing: z.boolean().default(false),
  purchase: actorOverrideSchema.optional(),
  withdrawal: actorOverrideSchema.extend({
    deadline: withdrawMarketplacePaymentsSchema.shape.deadline.optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.withdrawal && !value.purchase) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["withdrawal"],
      message: "withdrawal requires purchase in this commercialization flow",
    });
  }
});

export async function runCommercializeVoiceAssetWorkflow(
  context: ApiExecutionContext,
  auth: AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof commercializeVoiceAssetWorkflowSchema>,
) {
  const packaging = await runCreateDatasetAndListForSaleWorkflow(context, auth, walletAddress, body.packaging);
  const tokenId = packaging.dataset.datasetId;
  const tradeReadiness = packaging.listing.tradeReadiness;
  const listing = {
    created: packaging.listing,
    inspection: null as Awaited<ReturnType<typeof runInspectMarketplaceListingWorkflow>> | null,
    tradeReadiness,
    isTradable: tradeReadiness === "listed-and-tradable",
  };

  if (body.inspectListing) {
    listing.inspection = await runInspectMarketplaceListingWorkflow(context, auth, walletAddress, {
      tokenId,
    });
  }

  let purchase: Awaited<ReturnType<typeof runPurchaseMarketplaceAssetWorkflow>> | null = null;
  if (body.purchase) {
    const purchaseAuth = resolveChildAuthContext(context, body.purchase.apiKey, "purchase");
    purchase = await runPurchaseMarketplaceAssetWorkflow(
      context,
      purchaseAuth,
      body.purchase.walletAddress,
      purchaseMarketplaceAssetSchema.parse({ tokenId }),
    );
  }

  let withdrawal: Awaited<ReturnType<typeof runWithdrawMarketplacePaymentsWorkflow>> | null = null;
  if (body.withdrawal) {
    const withdrawalAuth = resolveChildAuthContext(context, body.withdrawal.apiKey, "withdrawal");
    withdrawal = await runWithdrawMarketplacePaymentsWorkflow(
      context,
      withdrawalAuth,
      body.withdrawal.walletAddress,
      withdrawMarketplacePaymentsSchema.parse({
        deadline: body.withdrawal.deadline,
      }),
    );
  }

  return {
    packaging: {
      licenseTemplate: packaging.licenseTemplate,
      dataset: packaging.dataset,
      ownership: packaging.ownership,
    },
    listing,
    purchase,
    withdrawal,
    summary: {
      seller: packaging.summary.signerAddress,
      tokenId,
      datasetId: packaging.dataset.datasetId,
      tradeReadiness,
      isTradable: listing.isTradable,
      listingInspectionRequested: body.inspectListing,
      purchaseRequested: Boolean(body.purchase),
      purchaseBuyer: body.purchase ? (purchase?.summary.buyer ?? body.purchase.walletAddress ?? null) : null,
      buyerFundingPrecondition: purchase?.preflight.buyerFunding.source ?? null,
      withdrawalRequested: Boolean(body.withdrawal),
      withdrawalPayee: withdrawal?.summary.payee ?? null,
    },
  };
}

function resolveChildAuthContext(
  context: ApiExecutionContext,
  apiKey: string,
  label: string,
): AuthContext {
  const childAuth = context.apiKeys[apiKey];
  if (!childAuth) {
    throw new HttpError(400, `commercialize-voice-asset received unknown ${label} apiKey`);
  }
  return childAuth;
}
