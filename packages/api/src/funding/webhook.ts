import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import express, { Router } from "express";
import { Pool } from "pg";
import { z } from "zod";

// Verify signed bytes before parsing. Bind event identity headers as well as the body.
export function verifyWebhook(body: Buffer, signature: string | undefined, secret: string,
  headers: Record<string, string | string[] | undefined>, now = Date.now()): boolean {
  try {
    if (!signature || !secret) return false;
    const parts = signature.split(",").map(part => part.trim().split("="));
    if (parts.some(part => part.length !== 2) || new Set(parts.map(part => part[0])).size !== parts.length) return false;
    const fields: Record<string, string> = Object.fromEntries(parts);
    if (!/^\d{10}$/.test(fields.t) || !/^[a-f0-9]{64}$/.test(fields.v1)) return false;
    if (Math.abs(now - Number(fields.t) * 1000) > 300_000) return false;
    const names = fields.h.split(" ");
    if (new Set(names).size !== names.length || !["content-type", "x-event-id", "x-event-type"].every(name => names.includes(name))) return false;
    if (!names.every(name => /^[a-z0-9-]+$/.test(name) && typeof headers[name] === "string")) return false;
    const values = names.map(name => headers[name]).join(".");
    const expected = createHmac("sha256", secret).update(`${fields.t}.${fields.h}.${values}.`).update(body).digest();
    return timingSafeEqual(expected, Buffer.from(fields.v1, "hex"));
  } catch { return false; }
}

export type WebhookInbox = { enqueue(id: string, type: string, digest: string, body: Buffer): Promise<boolean> };
export class PostgresWebhookInbox implements WebhookInbox {
  constructor(private readonly pool: Pool) {}
  async enqueue(id: string, type: string, digest: string, body: Buffer): Promise<boolean> {
    const result = await this.pool.query(`INSERT INTO funding_webhook_inbox (event_id,event_type,body_digest,raw_body)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING event_id`, [id,type,digest,body]);
    if (result.rowCount === 1) return true;
    const existing = await this.pool.query("SELECT body_digest,event_type FROM funding_webhook_inbox WHERE event_id=$1", [id]);
    if (existing.rows[0]?.body_digest !== digest || existing.rows[0]?.event_type !== type) throw new Error("Webhook identity collision");
    return false;
  }
}

export function createFundingWebhookRouter(env: NodeJS.ProcessEnv = process.env, inbox?: WebhookInbox): Router {
  const router = Router();
  if (env.API_LAYER_FUNDING_WEBHOOK_ENABLED !== "true") return router;
  const secret = env.API_LAYER_FUNDING_WEBHOOK_SECRET;
  const databaseUrl = env.SUPABASE_DB_URL;
  if (!secret || secret.length < 16 || !databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl)) throw new Error("Funding webhook requires a subscription secret and PostgreSQL URL");
  const store = inbox ?? new PostgresWebhookInbox(new Pool({ connectionString: databaseUrl, max: 3, allowExitOnIdle: true }));
  router.post("/v1/webhooks/coinbase/onramp", express.raw({ type: "application/json", limit: "256kb", inflate: false }), async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    if (!Buffer.isBuffer(request.body) || !verifyWebhook(request.body, request.header("x-webhook-signature") ?? request.header("x-hook0-signature"), secret, request.headers)) {
      response.status(401).json({ error: "Invalid webhook signature" }); return;
    }
    const id = z.string().min(1).max(256).safeParse(request.header("x-event-id"));
    const type = z.string().min(1).max(256).safeParse(request.header("x-event-type"));
    if (!id.success || !type.success) { response.status(400).json({ error: "Invalid webhook identity" }); return; }
    try { JSON.parse(request.body.toString("utf8")); } catch { response.status(400).json({ error: "Invalid webhook JSON" }); return; }
    try {
      const accepted = await store.enqueue(id.data, type.data, createHash("sha256").update(request.body).digest("hex"), request.body);
      response.status(200).json({ received: true, duplicate: !accepted });
    } catch { response.status(503).json({ error: "Webhook persistence unavailable" }); }
  });
  return router;
}
