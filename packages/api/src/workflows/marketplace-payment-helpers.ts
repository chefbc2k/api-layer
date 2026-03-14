import type { RouteResult } from "../shared/route-types.js";
import { normalizeAddress } from "./reward-campaign-helpers.js";

export type MarketplacePaymentConfig = {
  paymentToken: string | null;
  marketplacePaused: boolean | null;
  paymentPaused: boolean | null;
  treasury: string | null;
  devFund: string | null;
  unionTreasury: string | null;
};

export type MarketplacePendingPaymentsSnapshot = {
  seller: string | null;
  treasury: string | null;
  devFund: string | null;
  unionTreasury: string | null;
  payee?: string | null;
} & Record<string, string | null | undefined>;

export async function readMarketplacePaymentConfig(
  marketplace: {
    getUsdcToken: (request: unknown) => Promise<RouteResult>;
    isPaused: (request: unknown) => Promise<RouteResult>;
    paymentPaused: (request: unknown) => Promise<RouteResult>;
    getTreasuryAddress: (request: unknown) => Promise<RouteResult>;
    getDevFundAddress: (request: unknown) => Promise<RouteResult>;
    getUnionTreasuryAddress: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
): Promise<MarketplacePaymentConfig> {
  const [paymentToken, marketplacePaused, paymentPaused, treasury, devFund, unionTreasury] = await Promise.all([
    marketplace.getUsdcToken({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    marketplace.isPaused({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    marketplace.paymentPaused({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    marketplace.getTreasuryAddress({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    marketplace.getDevFundAddress({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
    marketplace.getUnionTreasuryAddress({
      auth,
      api: { executionSource: "live", gaslessMode: "none" },
      walletAddress,
      wireParams: [],
    }),
  ]);

  return {
    paymentToken: normalizeAddress(paymentToken.body),
    marketplacePaused: typeof marketplacePaused.body === "boolean" ? marketplacePaused.body : null,
    paymentPaused: typeof paymentPaused.body === "boolean" ? paymentPaused.body : null,
    treasury: normalizeAddress(treasury.body),
    devFund: normalizeAddress(devFund.body),
    unionTreasury: normalizeAddress(unionTreasury.body),
  };
}

export async function readPendingPaymentsSnapshot(
  marketplace: {
    getPendingPayments: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  addresses: {
    seller?: string | null;
    treasury?: string | null;
    devFund?: string | null;
    unionTreasury?: string | null;
    payee?: string | null;
  },
): Promise<MarketplacePendingPaymentsSnapshot> {
  const extraEntries = Object.entries(addresses).filter(([key]) => !["seller", "treasury", "devFund", "unionTreasury", "payee"].includes(key));

  const [seller, treasury, devFund, unionTreasury, payee, extras] = await Promise.all([
    readPendingPayment(marketplace, auth, walletAddress, addresses.seller ?? null),
    readPendingPayment(marketplace, auth, walletAddress, addresses.treasury ?? null),
    readPendingPayment(marketplace, auth, walletAddress, addresses.devFund ?? null),
    readPendingPayment(marketplace, auth, walletAddress, addresses.unionTreasury ?? null),
    "payee" in addresses ? readPendingPayment(marketplace, auth, walletAddress, addresses.payee ?? null) : Promise.resolve(undefined),
    Promise.all(extraEntries.map(async ([key, address]) => [key, await readPendingPayment(marketplace, auth, walletAddress, address ?? null)] as const)),
  ]);

  return {
    seller,
    treasury,
    devFund,
    unionTreasury,
    ...(payee === undefined ? {} : { payee }),
    ...Object.fromEntries(extras),
  };
}

async function readPendingPayment(
  marketplace: {
    getPendingPayments: (request: unknown) => Promise<RouteResult>;
  },
  auth: import("../shared/auth.js").AuthContext,
  walletAddress: string | undefined,
  payee: string | null,
): Promise<string | null> {
  if (!payee) {
    return null;
  }
  const result = await marketplace.getPendingPayments({
    auth,
    api: { executionSource: "live", gaslessMode: "none" },
    walletAddress,
    wireParams: [payee],
  });
  if (typeof result.body === "string" || typeof result.body === "number" || typeof result.body === "bigint") {
    return String(result.body);
  }
  return null;
}
