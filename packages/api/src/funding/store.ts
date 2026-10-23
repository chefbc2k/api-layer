import { Pool } from "pg";
import type { CoinbaseQuote } from "./provider.js";

export type FundingQuoteInsert = {
  userId: string; wallet: string; chainId: number; token: string;
  paymentMethod: string; requestAmount: string; amountKind: "payment" | "purchase";
  sandbox: boolean; quote: CoinbaseQuote;
};

export class FundingStore {
  constructor(private readonly pool: Pool) {}

  async insertQuote(input: FundingQuoteInsert): Promise<{ id: string; expiresAt: string }> {
    const result = await this.pool.query<{ id: string; expires_at: Date }>(`
      INSERT INTO funding_quotes (user_id, wallet_address, chain_id, token_address, payment_method,
        request_amount, amount_kind, sandbox, quote, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, now() + interval '60 seconds')
      RETURNING id, expires_at`, [input.userId, input.wallet.toLowerCase(), input.chainId, input.token.toLowerCase(),
      input.paymentMethod, input.requestAmount, input.amountKind, input.sandbox, JSON.stringify(input.quote)]);
    return { id: result.rows[0].id, expiresAt: result.rows[0].expires_at.toISOString() };
  }

  async getQuote(id: string, userId: string): Promise<FundingQuoteInsert["quote"] | null> {
    const result = await this.pool.query<{ quote: CoinbaseQuote }>(
      "SELECT quote FROM funding_quotes WHERE id = $1 AND user_id = $2 AND expires_at > now()", [id, userId]);
    return result.rows[0]?.quote ?? null;
  }
}
