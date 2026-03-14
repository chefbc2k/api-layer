import { z } from "zod";

import type { ApiExecutionContext } from "../shared/execution-context.js";
import { createMarketplacePrimitiveService } from "../modules/marketplace/primitives/generated/index.js";
import { readMarketplacePaymentConfig, readPendingPaymentsSnapshot } from "./marketplace-payment-helpers.js";
import { asRecord, normalizeAddress, waitForWorkflowReadback } from "./reward-campaign-helpers.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/u);
const digitsSchema = z.string().regex(/^\d+$/u);

export const inspectRevenuePostureWorkflowSchema = z.object({
  assetTokenIds: z.array(digitsSchema).optional(),
  additionalPayees: z.array(addressSchema).optional(),
  includeTreasuryControls: z.boolean().optional(),
});

export async function runInspectRevenuePostureWorkflow(
  context: ApiExecutionContext,
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  body: z.infer<typeof inspectRevenuePostureWorkflowSchema>,
) {
  const marketplace = createMarketplacePrimitiveService(context);
  const config = await readMarketplacePaymentConfig(marketplace, auth, walletAddress);

  const [revenueMetrics, pending, assetRevenues, treasuryControls] = await Promise.all([
    waitForWorkflowReadback(
      () => marketplace.getRevenueMetrics({
        auth,
        api: { executionSource: "live", gaslessMode: "none" },
        walletAddress,
        wireParams: [],
      }),
      (result) => result.statusCode === 200,
      "inspectRevenuePosture.revenueMetrics",
    ),
    waitForWorkflowReadback(
      () => readPendingPaymentsSnapshot(marketplace, auth, walletAddress, buildPendingAddressSet(config, body.additionalPayees)).then((snapshot) => ({
        statusCode: 200,
        body: snapshot,
      })),
      (result) => result.statusCode === 200,
      "inspectRevenuePosture.pending",
    ),
    Promise.all((body.assetTokenIds ?? []).map(async (tokenId) => {
      const result = await waitForWorkflowReadback(
        () => marketplace.getAssetRevenue({
          auth,
          api: { executionSource: "live", gaslessMode: "none" },
          walletAddress,
          wireParams: [tokenId],
        }),
        (readback) => readback.statusCode === 200,
        `inspectRevenuePosture.assetRevenue.${tokenId}`,
      );
      return {
        tokenId,
        revenue: result.body,
      };
    })),
    body.includeTreasuryControls
      ? Promise.all([
          waitForWorkflowReadback(
            () => marketplace.getTreasuryWithdrawalLimit({
              auth,
              api: { executionSource: "live", gaslessMode: "none" },
              walletAddress,
              wireParams: [],
            }),
            (result) => result.statusCode === 200,
            "inspectRevenuePosture.treasuryWithdrawalLimit",
          ),
          waitForWorkflowReadback(
            () => marketplace.getBuybackStatus({
              auth,
              api: { executionSource: "live", gaslessMode: "none" },
              walletAddress,
              wireParams: [],
            }),
            (result) => result.statusCode === 200,
            "inspectRevenuePosture.buybackStatus",
          ),
        ]).then(([treasuryWithdrawalLimit, buybackStatus]) => ({
          treasuryWithdrawalLimit: treasuryWithdrawalLimit.body,
          buybackStatus: buybackStatus.body,
        }))
      : Promise.resolve(null),
  ]);

  return {
    funding: {
      paymentToken: config.paymentToken,
      marketplacePaused: config.marketplacePaused,
      paymentPaused: config.paymentPaused,
      treasury: config.treasury,
      devFund: config.devFund,
      unionTreasury: config.unionTreasury,
    },
    revenue: {
      metrics: revenueMetrics.body,
      assetRevenues,
    },
    pending: {
      snapshot: pending.body,
      additionalPayees: collectAdditionalPayeeSummaries(body.additionalPayees ?? [], pending.body),
    },
    treasuryControls: treasuryControls,
    summary: {
      assetCount: assetRevenues.length,
      additionalPayeeCount: body.additionalPayees?.length ?? 0,
      includeTreasuryControls: body.includeTreasuryControls === true,
      paymentPaused: config.paymentPaused,
      marketplacePaused: config.marketplacePaused,
    },
  };
}

function buildPendingAddressSet(
  config: {
    treasury: string | null,
    devFund: string | null,
    unionTreasury: string | null,
  },
  additionalPayees: string[] | undefined,
) {
  const uniqueAdditional = [...new Set((additionalPayees ?? []).map((payee) => normalizeAddress(payee)).filter((payee): payee is string => Boolean(payee)))];
  const addresses: {
    treasury?: string | null,
    devFund?: string | null,
    unionTreasury?: string | null,
  } & Record<string, string | null | undefined> = {
    treasury: config.treasury,
    devFund: config.devFund,
    unionTreasury: config.unionTreasury,
  };
  uniqueAdditional.forEach((payee, index) => {
    addresses[`additional_${index}`] = payee;
  });
  return addresses;
}

function collectAdditionalPayeeSummaries(
  additionalPayees: string[],
  snapshot: unknown,
) {
  const record = asRecord(snapshot);
  const normalized = [...new Set(additionalPayees.map((payee) => normalizeAddress(payee)).filter((payee): payee is string => Boolean(payee)))];
  return normalized.map((payee, index) => ({
    payee,
    pending: typeof record?.[`additional_${index}`] === "string" ? record[`additional_${index}`] : null,
  }));
}
