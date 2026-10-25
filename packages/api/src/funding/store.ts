import { Pool } from "pg";
import type { CoinbaseQuote } from "./provider.js";
import { HttpError } from "../shared/errors.js";

export type FundingQuoteInsert = {
  userId: string; wallet: string; chainId: number; token: string;
  paymentMethod: string; requestAmount: string; amountKind: "payment" | "purchase";
  sandbox: boolean; quote: CoinbaseQuote;
};

export type FundingAttempt = {
  id: string; user_id: string; kind: "headless" | "hosted"; fingerprint: string;
  wallet_address: string; chain_id: string; sandbox: boolean; state: "creating" | "uncertain" | "ready";
  provider_order_id: string | null; provider_status: string | null; checkout_ciphertext: string | null;
  checkout_expires_at: Date | null; created_at: Date;
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

  async getQuoteRecord(id: string, userId: string): Promise<{
    wallet_address: string; chain_id: string; token_address: string; payment_method: string;
    request_amount: string; amount_kind: "payment" | "purchase"; sandbox: boolean; quote: CoinbaseQuote;
  } | null> {
    const result = await this.pool.query("SELECT * FROM funding_quotes WHERE id=$1 AND user_id=$2 AND expires_at > now()", [id, userId]);
    return result.rows[0] ?? null;
  }

  async findAttempt(userId: string, kind: string, key: string): Promise<FundingAttempt | null> {
    const result = await this.pool.query<FundingAttempt>("SELECT * FROM funding_attempts WHERE user_id=$1 AND kind=$2 AND idempotency_key=$3", [userId, kind, key]);
    return result.rows[0] ?? null;
  }

  async beginAttempt(input: { userId: string; kind: "headless" | "hosted"; key: string; fingerprint: string;
    quoteId?: string; wallet: string; chainId: number; sandbox: boolean }): Promise<{ created: boolean; attempt: FundingAttempt }> {
    try {
      const result = await this.pool.query<FundingAttempt>(`INSERT INTO funding_attempts
        (user_id, kind, idempotency_key, fingerprint, quote_id, wallet_address, chain_id, sandbox)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (user_id, kind, idempotency_key) DO NOTHING RETURNING *`,
      [input.userId, input.kind, input.key, input.fingerprint, input.quoteId ?? null, input.wallet.toLowerCase(), input.chainId, input.sandbox]);
      const attempt = result.rows[0] ?? await this.findAttempt(input.userId, input.kind, input.key);
      if (!attempt) throw new Error("Missing funding attempt");
      if (attempt.fingerprint !== input.fingerprint) throw new HttpError(409, "Idempotency key was already used for a different checkout");
      return { created: result.rowCount === 1, attempt };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new HttpError(409, "Another checkout for this quote or an unresolved funding attempt already exists");
      throw error;
    }
  }

  async completeAttempt(id: string, userId: string, ciphertext: string, expiresAt: Date, orderId?: string, status?: string): Promise<FundingAttempt> {
    const result = await this.pool.query<FundingAttempt>(`UPDATE funding_attempts SET state='ready', checkout_ciphertext=$3,
      checkout_expires_at=$4, provider_order_id=$5, provider_status=$6, updated_at=now()
      WHERE id=$1 AND user_id=$2 AND state IN ('creating','uncertain') RETURNING *`, [id, userId, ciphertext, expiresAt, orderId ?? null, status ?? null]);
    if (!result.rows[0]) throw new Error("Funding attempt could not be completed");
    return result.rows[0];
  }

  async markUncertain(id: string, userId: string): Promise<void> {
    // A failed acknowledgement after a successful commit must not overwrite a ready record.
    await this.pool.query("UPDATE funding_attempts SET state='uncertain', updated_at=now() WHERE id=$1 AND user_id=$2 AND state='creating'", [id, userId]);
  }

  async getAttempt(id: string, userId: string): Promise<FundingAttempt | null> {
    const result = await this.pool.query<FundingAttempt>("SELECT * FROM funding_attempts WHERE id=$1 AND user_id=$2", [id, userId]);
    return result.rows[0] ?? null;
  }

  async history(userId: string, limit: number, cursor?: string): Promise<FundingAttempt[]> {
    const result = await this.pool.query<FundingAttempt>(`SELECT * FROM funding_attempts WHERE user_id=$1
      AND ($3::uuid IS NULL OR (created_at,id) < (SELECT created_at,id FROM funding_attempts WHERE id=$3 AND user_id=$1))
      ORDER BY created_at DESC,id DESC LIMIT $2`, [userId, limit, cursor ?? null]);
    return result.rows;
  }
}
