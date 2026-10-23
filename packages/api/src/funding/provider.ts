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

  async quote(input: Record<string, unknown>): Promise<CoinbaseQuote> {
    // This adapter deliberately cannot create a payable order.
    const result = await this.request("api.cdp.coinbase.com", "/platform/v2/onramp/orders", quoteSchema, undefined, {
      ...input, isQuote: true, destinationNetwork: "base", purchaseCurrency: "USDC", paymentCurrency: "USD",
    }) as z.infer<typeof quoteSchema>;
    return result.order;
  }
}
