import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { z } from "zod";
import { HttpError } from "../shared/errors.js";
import type { FundingConfig } from "./config.js";

const limitSchema = z.object({ id: z.string(), min: z.string(), max: z.string() });
export const optionsSchema = z.object({
  payment_currencies: z.array(z.object({ id: z.string(), limits: z.array(limitSchema) })),
  purchase_currencies: z.array(z.object({ symbol: z.string(), networks: z.array(z.object({
    name: z.string(), chain_id: z.union([z.string(), z.number()]), contract_address: z.string(),
  })) })),
});
export const quoteSchema = z.object({ order: z.object({
  paymentTotal: z.string(), paymentSubtotal: z.string(), paymentCurrency: z.literal("USD"),
  purchaseAmount: z.string(), purchaseCurrency: z.literal("USDC"),
  destinationAddress: z.string(), destinationNetwork: z.literal("base"),
  fees: z.array(z.object({ type: z.string(), amount: z.string(), currency: z.literal("USD") })),
}) });
export const orderSchema = z.object({
  order: quoteSchema.shape.order.extend({
    orderId: z.string().uuid(), status: z.string().min(1),
    paymentMethod: z.enum(["GUEST_CHECKOUT_APPLE_PAY", "GUEST_CHECKOUT_GOOGLE_PAY"]),
    partnerUserRef: z.string().min(1),
  }),
  paymentLink: z.object({ url: z.string().url(), paymentLinkType: z.string().min(1) }),
  // Kept only in server-owned storage, never sent to the customer API.
  userAuthToken: z.string().min(1).optional(),
});
export type CoinbaseOrder = z.infer<typeof orderSchema>;
export type CoinbaseQuote = z.infer<typeof quoteSchema>["order"];

export class CoinbaseFundingProvider {
  constructor(
    private readonly config: FundingConfig,
    private readonly fetcher: typeof fetch = fetch,
    private readonly sign: typeof generateJwt = generateJwt,
  ) {}

  private async request(host: string, pathname: string, schema: z.ZodType, query?: URLSearchParams, body?: unknown): Promise<unknown> {
    const method = body === undefined ? "GET" : "POST";
    try {
      const token = await this.sign({
        apiKeyId: this.config.apiKeyId, apiKeySecret: this.config.apiKeySecret,
        requestMethod: method, requestHost: host, requestPath: pathname, expiresIn: 120,
      });
      const response = await this.fetcher(`https://${host}${pathname}${query ? `?${query}` : ""}`, {
        method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(10_000), redirect: "error",
      });
      if (!response.ok) throw new Error("upstream rejected request");
      return schema.parse(await response.json());
    } catch {
      // Provider error bodies can contain PII, credentials and request details.
      throw new HttpError(502, "Coinbase funding request failed; retry later");
    }
  }

  async options(country: string, subdivision?: string): Promise<z.infer<typeof optionsSchema>> {
    const query = new URLSearchParams({ country, networks: "base" });
    if (subdivision) query.set("subdivision", subdivision);
    return await this.request("api.developer.coinbase.com", "/onramp/v1/buy/options", optionsSchema, query) as z.infer<typeof optionsSchema>;
  }

  async createSandboxOrder(input: {
    destinationAddress: string; partnerUserRef: string; partnerOrderRef: string;
    paymentMethod: "GUEST_CHECKOUT_APPLE_PAY" | "GUEST_CHECKOUT_GOOGLE_PAY";
    purchaseAmount?: string; paymentAmount?: string; clientIp: string; domain: string;
  }): Promise<CoinbaseOrder> {
    if (this.config.mode !== "sandbox" || !this.config.sandboxOrdersEnabled || !input.partnerUserRef.startsWith("sandbox-")) {
      throw new HttpError(503, "Sandbox funding orders are not enabled");
    }
    // Explicit fields select embedded verification; never accept client attestations or contact details.
    const result = await this.request("api.cdp.coinbase.com", "/platform/v2/onramp/orders", orderSchema, undefined, {
      destinationAddress: input.destinationAddress, partnerUserRef: input.partnerUserRef,
      partnerOrderRef: input.partnerOrderRef, paymentMethod: input.paymentMethod,
      ...(input.purchaseAmount === undefined ? { paymentAmount: input.paymentAmount } : { purchaseAmount: input.purchaseAmount }),
      clientIp: input.clientIp, domain: input.domain,
      isQuote: false, destinationNetwork: "base", purchaseCurrency: "USDC", paymentCurrency: "USD",
    }) as CoinbaseOrder;
    try {
      const url = new URL(result.paymentLink.url);
      if (url.origin !== "https://pay.coinbase.com" || url.username || url.password) throw new Error("unapproved checkout URL");
      url.searchParams.set(input.paymentMethod === "GUEST_CHECKOUT_APPLE_PAY" ? "useApplePaySandbox" : "useGooglePaySandbox", "true");
      result.paymentLink.url = url.toString();
      if (result.order.partnerUserRef !== input.partnerUserRef || result.order.paymentMethod !== input.paymentMethod) throw new Error("order mismatch");
    } catch { throw new HttpError(502, "Coinbase returned an inconsistent sandbox order"); }
    return result;
  }

  async quote(input: Record<string, unknown>): Promise<CoinbaseQuote> {
    // Quote requests always remain non-payable, including after orders are enabled.
    const result = await this.request("api.cdp.coinbase.com", "/platform/v2/onramp/orders", quoteSchema, undefined, {
      ...input, isQuote: true, destinationNetwork: "base", purchaseCurrency: "USDC", paymentCurrency: "USD",
    }) as z.infer<typeof quoteSchema>;
    return result.order;
  }
}
