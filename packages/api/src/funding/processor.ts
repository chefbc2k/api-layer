import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { providerOrderSchema, type CoinbaseFundingProvider } from "./provider.js";
import { decimalUnits } from "./config.js";

const prefix = "ONRAMP_ORDER_STATUS_";
const ranks: Record<string, number> = { PENDING_AUTH: 0, PENDING_PAYMENT: 1, PROCESSING: 2, FAILED: 3, COMPLETED: 4 };
export function chooseStatus(previous: string | null, next: string, previousAt: Date | null, nextAt: Date): string | null {
  const old = previous?.replace(prefix, ""); const value = next.replace(prefix, "");
  if (!(value in ranks)) throw new Error("unsupported_status");
  if (old === "COMPLETED") return null;
  if (previousAt && nextAt < previousAt) return null;
  if (old && ranks[value] < ranks[old]) return null;
  return next;
}
const types = new Set(["onramp.transaction.created", "onramp.transaction.updated", "onramp.transaction.success", "onramp.transaction.failed"]);
const transaction = z.object({ transactionId: z.string().uuid(), partnerUserRef: z.string(), walletAddress: z.string(),
  purchaseCurrency: z.literal("USDC"), purchaseNetwork: z.literal("base"), purchaseAmount: z.object({ currency: z.literal("USDC"), value: z.string() }),
  createdAt: z.string().datetime(), completedAt: z.string().datetime().optional(),
  status: z.enum(["ONRAMP_TRANSACTION_STATUS_CREATED", "ONRAMP_TRANSACTION_STATUS_IN_PROGRESS", "ONRAMP_TRANSACTION_STATUS_SUCCESS", "ONRAMP_TRANSACTION_STATUS_FAILED"]),
  txHash: z.string().optional(),
});

export class FundingProcessor {
  constructor(private readonly pool: Pool, private readonly provider: Pick<CoinbaseFundingProvider,"getOrder">) {}
  async runOne(): Promise<"idle" | "processed" | "retry" | "quarantined"> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(`SELECT * FROM funding_webhook_inbox WHERE processed_at IS NULL AND quarantined_at IS NULL
        AND next_attempt_at <= now() ORDER BY received_at,event_id FOR UPDATE SKIP LOCKED LIMIT 1`);
      const row = found.rows[0];
      if (!row) { await client.query("COMMIT"); return "idle"; }
      await client.query("SAVEPOINT event_processing");
      try {
        const event = JSON.parse(row.raw_body.toString("utf8"));
        if (!types.has(row.event_type) || event.eventType !== row.event_type) throw new Error("unsupported_event");
        const orderId = z.string().uuid().optional().parse(event.orderId);
        const ref = z.string().min(1).parse(event.partnerUserRef);
        // Old stable per-user references cannot safely identify an unknown checkout.
        const attempts = await client.query(`SELECT * FROM funding_attempts WHERE
          (provider_order_id=$1 AND $1 IS NOT NULL) OR provider_user_ref=$2 FOR UPDATE`, [orderId ?? null, ref]);
        if (attempts.rowCount !== 1) throw new Error("unmatched_attempt");
        const attempt = attempts.rows[0];
        const expectedRef = attempt.provider_user_ref ?? `${attempt.sandbox ? "sandbox-" : ""}${createHash("sha256").update(`uspeaks:${attempt.user_id}`).digest("hex").slice(0,32)}`;
        if (ref !== expectedRef) throw new Error("identity_mismatch");
        let status: string, at: Date, txHash: string | undefined, transactionId: string | undefined;
        if (orderId) {
          if (attempt.kind !== "headless" || (attempt.provider_order_id && attempt.provider_order_id !== orderId)) throw new Error("identity_mismatch");
          const current = providerOrderSchema.parse(await this.provider.getOrder(orderId));
          if (current.orderId !== orderId || current.partnerUserRef !== expectedRef || current.destinationAddress.toLowerCase() !== attempt.wallet_address || !current.updatedAt) throw new Error("identity_mismatch");
          decimalUnits(current.purchaseAmount,6);
          status=current.status; at=new Date(current.updatedAt); txHash=current.txHash;
        } else {
          if (attempt.kind !== "hosted") throw new Error("identity_mismatch");
          const current = transaction.parse(event);
          if (current.walletAddress.toLowerCase() !== attempt.wallet_address || (attempt.provider_transaction_id && attempt.provider_transaction_id !== current.transactionId)) throw new Error("identity_mismatch");
          if (decimalUnits(current.purchaseAmount.value,6) <= 0n) throw new Error("invalid_amount");
          status=prefix+({ ONRAMP_TRANSACTION_STATUS_CREATED:"PENDING_PAYMENT", ONRAMP_TRANSACTION_STATUS_IN_PROGRESS:"PROCESSING", ONRAMP_TRANSACTION_STATUS_SUCCESS:"COMPLETED", ONRAMP_TRANSACTION_STATUS_FAILED:"FAILED" }[current.status]);
          at=new Date(current.completedAt && !current.completedAt.startsWith("0001-") ? current.completedAt : current.createdAt);
          txHash=current.txHash && /^0x[0-9a-fA-F]{64}$/.test(current.txHash) ? current.txHash : undefined;
          transactionId=current.transactionId;
        }
        const chosen = chooseStatus(attempt.provider_status,status,attempt.provider_updated_at,at);
        if (chosen) await this.observe(client, attempt.id, chosen, at, orderId, transactionId, txHash);
        await client.query("UPDATE funding_webhook_inbox SET processed_at=now(), attempts=attempts+1,last_error=NULL WHERE event_id=$1", [row.event_id]);
        await client.query("COMMIT"); return "processed";
      } catch (error) {
        await client.query("ROLLBACK TO SAVEPOINT event_processing");
        const attempts=Number(row.attempts)+1;
        // Fixed categories only: provider errors and payloads must never enter logs/error fields.
        const category=error instanceof Error && ["unsupported_event","unmatched_attempt","identity_mismatch","invalid_amount"].includes(error.message) ? error.message : "processing_failed";
        await client.query(`UPDATE funding_webhook_inbox SET attempts=$2,last_error=$3,
          next_attempt_at=now()+($4::text||' seconds')::interval, quarantined_at=CASE WHEN $2>=8 THEN now() ELSE NULL END WHERE event_id=$1`,
        [row.event_id,attempts,category,Math.min(3600,2**attempts)]);
        await client.query("COMMIT"); return attempts>=8 ? "quarantined" : "retry";
      }
    } catch (error) { await client.query("ROLLBACK").catch(()=>undefined); throw error; }
    finally { client.release(); }
  }
  private async observe(client: PoolClient, id: string, status: string, at: Date, orderId?: string, transactionId?: string, txHash?: string) {
    await client.query(`UPDATE funding_attempts SET provider_status=$2,provider_updated_at=$3,
      provider_order_id=coalesce(provider_order_id,$4),provider_transaction_id=coalesce(provider_transaction_id,$5),
      provider_tx_hash=coalesce($6,provider_tx_hash),state='ready',updated_at=now() WHERE id=$1`, [id,status,at,orderId ?? null,transactionId ?? null,txHash ?? null]);
  }
}
