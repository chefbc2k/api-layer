import { Pool } from "pg";
import type { CoinbaseQuote, CoinbaseOrder } from "./provider.js";
import { HttpError } from "../shared/errors.js";

export type FundingOrderRecord = {
  id: string; user_id: string; request_hash: string; wallet_address: string; chain_id: string;
  token_address: string; sandbox: boolean; state: "creating" | "checkout_created" | "unknown";
  provider_order_id: string | null; provider_response: CoinbaseOrder | null;
  created_at: Date; updated_at: Date;
};
export type FundingOrderReservation = {
  userId: string; idempotencyKey: string; requestHash: string; wallet: string; chainId: number; token: string;
};

export type FundingQuoteInsert = {
  userId: string; wallet: string; chainId: number; token: string;
  paymentMethod: string; requestAmount: string; amountKind: "payment" | "purchase";
  sandbox: boolean; quote: CoinbaseQuote;
};

export class FundingStore {
  constructor(private readonly pool: Pool) {}

  async reserveOrder(input: FundingOrderReservation): Promise<{ record: FundingOrderRecord; fresh: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Serialize all keys for this customer, including requests in other API instances.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.userId]);
      const existing = await client.query<FundingOrderRecord>(
        "SELECT * FROM funding_orders WHERE user_id=$1 AND idempotency_key=$2", [input.userId, input.idempotencyKey]);
      if (existing.rows[0]) {
        if (existing.rows[0].request_hash !== input.requestHash) throw new HttpError(409, "Idempotency key was already used for a different funding request");
        await client.query("COMMIT");
        return { record: existing.rows[0], fresh: false };
      }
      const unresolved = await client.query("SELECT id FROM funding_orders WHERE user_id=$1 AND state IN ('creating', 'unknown')", [input.userId]);
      if (unresolved.rowCount) throw new HttpError(409, "An earlier funding attempt requires reconciliation before another order");
      const result = await client.query<FundingOrderRecord>(`
        INSERT INTO funding_orders (user_id, idempotency_key, request_hash, wallet_address, chain_id, token_address, sandbox)
        VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING *`,
      [input.userId, input.idempotencyKey, input.requestHash, input.wallet.toLowerCase(), input.chainId, input.token.toLowerCase()]);
      await client.query("COMMIT");
      return { record: result.rows[0], fresh: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async completeOrder(id: string, userId: string, response: CoinbaseOrder): Promise<FundingOrderRecord> {
    const result = await this.pool.query<FundingOrderRecord>(`
      UPDATE funding_orders SET state='checkout_created', provider_order_id=$3, provider_response=$4::jsonb, updated_at=now()
      WHERE id=$1 AND user_id=$2 AND state='creating' RETURNING *`, [id, userId, response.order.orderId, JSON.stringify(response)]);
    if (!result.rows[0]) throw new Error("Funding order is not awaiting creation");
    return result.rows[0];
  }

  async markOrderUnknown(id: string, userId: string): Promise<void> {
    await this.pool.query("UPDATE funding_orders SET state='unknown', updated_at=now() WHERE id=$1 AND user_id=$2 AND state='creating'", [id, userId]);
  }

  async getOrder(id: string, userId: string): Promise<FundingOrderRecord | null> {
    const result = await this.pool.query<FundingOrderRecord>("SELECT * FROM funding_orders WHERE id=$1 AND user_id=$2", [id, userId]);
    return result.rows[0] ?? null;
  }

  async listOrders(userId: string, limit: number, cursor?: { createdAt: string; id: string }): Promise<FundingOrderRecord[]> {
    const result = await this.pool.query<FundingOrderRecord>(`
      SELECT * FROM funding_orders WHERE user_id=$1
      AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::uuid))
      ORDER BY created_at DESC, id DESC LIMIT $2`, [userId, limit, cursor?.createdAt ?? null, cursor?.id ?? null]);
    return result.rows;
  }

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
