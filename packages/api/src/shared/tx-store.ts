import { Pool } from "pg";

export type TxRequestInsert = {
  requesterWallet?: string;
  signerId?: string;
  method: string;
  params: unknown[];
  status: string;
  relayMode?: string;
  apiKeyLabel?: string;
  requestHash?: string;
  spendCapDecision?: string;
  responsePayload?: unknown;
  txHash?: string;
};

export type TxRequestRecord = {
  id: string;
  requester_wallet: string | null;
  signer_id: string | null;
  method: string;
  params: unknown;
  tx_hash: string | null;
  status: string;
  response_payload: unknown;
  relay_mode: string | null;
  api_key_label: string | null;
  request_hash: string | null;
  spend_cap_decision: string | null;
  created_at: string;
  updated_at: string;
};

export class TxRequestStore {
  private readonly pool: Pool | null;

  constructor(connectionString: string | undefined = process.env.SUPABASE_DB_URL) {
    this.pool = connectionString ? new Pool({ connectionString }) : null;
  }

  enabled(): boolean {
    return this.pool !== null;
  }

  async insert(request: TxRequestInsert): Promise<string | null> {
    if (!this.pool) {
      return null;
    }
    const result = await this.pool.query<{ id: string }>(
      `
        INSERT INTO tx_requests (
          requester_wallet,
          signer_id,
          method,
          params,
          tx_hash,
          status,
          response_payload,
          relay_mode,
          api_key_label,
          request_hash,
          spend_cap_decision
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, $10, $11)
        RETURNING id
      `,
      [
        request.requesterWallet ?? null,
        request.signerId ?? null,
        request.method,
        JSON.stringify(request.params),
        request.txHash ?? null,
        request.status,
        JSON.stringify(request.responsePayload ?? null),
        request.relayMode ?? null,
        request.apiKeyLabel ?? null,
        request.requestHash ?? null,
        request.spendCapDecision ?? null,
      ],
    );
    return result.rows[0]?.id ?? null;
  }

  async update(id: string, patch: Pick<TxRequestInsert, "status" | "responsePayload" | "txHash" | "requestHash" | "spendCapDecision">): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.query(
      `
        UPDATE tx_requests
        SET status = COALESCE($2, status),
            response_payload = COALESCE($3::jsonb, response_payload),
            tx_hash = COALESCE($4, tx_hash),
            request_hash = COALESCE($5, request_hash),
            spend_cap_decision = COALESCE($6, spend_cap_decision),
            updated_at = timezone('utc', now())
        WHERE id = $1
      `,
      [
        id,
        patch.status ?? null,
        patch.responsePayload === undefined ? null : JSON.stringify(patch.responsePayload),
        patch.txHash ?? null,
        patch.requestHash ?? null,
        patch.spendCapDecision ?? null,
      ],
    );
  }

  async get(id: string): Promise<TxRequestRecord | null> {
    if (!this.pool) {
      return null;
    }
    const result = await this.pool.query<TxRequestRecord>(
      "SELECT * FROM tx_requests WHERE id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}
