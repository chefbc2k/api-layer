import { createHash } from "node:crypto";
import { FundingProcessor } from "./processor.js";
import { PostgresWebhookInbox } from "./webhook.js";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { FundingStore } from "./store.js";
import { BASE_USDC } from "./config.js";

const database = process.env.API_LAYER_FUNDING_TEST_DB_URL;
describe.skipIf(!database)("durable PostgreSQL funding quotes", () => {
  const pool = new Pool({ connectionString: database });
  const store = new FundingStore(pool);
  afterAll(async () => { await pool.end(); });
  const input = {
    userId: "funding_customer_a", wallet: "0x00000000000000000000000000000000000000AA", chainId: 8453,
    token: BASE_USDC, paymentMethod: "GUEST_CHECKOUT_APPLE_PAY", requestAmount: "100", amountKind: "purchase" as const, sandbox: true,
    quote: { paymentTotal: "100.75", paymentSubtotal: "100", paymentCurrency: "USD" as const,
      purchaseAmount: "100.000000", purchaseCurrency: "USDC" as const, destinationAddress: "0x00000000000000000000000000000000000000AA",
      destinationNetwork: "base" as const, fees: [{ type: "FEE_TYPE_NETWORK", amount: "0.75", currency: "USD" as const }] },
  };

  it("persists exact decimal pricing across independent connections and denies another owner", async () => {
    const record = await store.insertQuote(input);
    expect(record.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(new Date(record.expiresAt).getTime()).toBeGreaterThan(Date.now());
    const otherPool = new Pool({ connectionString: database });
    try {
      const restarted = new FundingStore(otherPool);
      expect(await restarted.getQuote(record.id, input.userId)).toEqual(input.quote);
      expect(await restarted.getQuote(record.id, "funding_customer_b")).toBeNull();
      const row = await otherPool.query("SELECT request_amount::text, wallet_address FROM funding_quotes WHERE id=$1", [record.id]);
      expect(row.rows[0]).toEqual({ request_amount: "100.000000", wallet_address: input.wallet.toLowerCase() });
    } finally { await otherPool.end(); }
  });

  it("does not return expired quotes", async () => {
    const record = await store.insertQuote(input);
    await pool.query("UPDATE funding_quotes SET created_at=now()-interval '2 minutes', expires_at=now()-interval '1 minute' WHERE id=$1", [record.id]);
    expect(await store.getQuote(record.id, input.userId)).toBeNull();
  });

  it("prevents public and browser-authenticated access to private pricing records", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM funding_quotes")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
      await client.query("SET ROLE service_role");
      expect((await client.query("SELECT * FROM funding_quotes")).rows.length).toBeGreaterThan(0);
    } finally { await client.query("RESET ROLE"); client.release(); }
  });

  it.each([
    { requestAmount: "0" }, { requestAmount: "-1" }, { paymentMethod: "CARD" }, { chainId: 1 }, { chainId: 84532, sandbox: false },
  ])("enforces database financial constraints %j", async patch => {
    await expect(store.insertQuote({ ...input, ...patch })).rejects.toThrow();
  });
});

describe.skipIf(!database)("durable checkout concurrency and restart", () => {
  const pool = new Pool({ connectionString: database });
  const store = new FundingStore(pool);
  afterAll(async () => { await pool.end(); });
  const input = (userId: string, key = "checkout_key_0001") => ({ userId, key, kind: "hosted" as const,
    fingerprint: "a".repeat(64), wallet: "0x00000000000000000000000000000000000000aa", chainId: 8453, sandbox: true });

  it("reserves exactly once across concurrent connections", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => store.beginAttempt(input("concurrent_owner"))));
    expect(results.filter(result => result.created)).toHaveLength(1);
    expect(new Set(results.map(result => result.attempt.id)).size).toBe(1);
  });
  it("rejects a changed fingerprint and a new key while creation is unresolved", async () => {
    await store.beginAttempt(input("locked_owner"));
    await expect(store.beginAttempt({ ...input("locked_owner"), fingerprint: "b".repeat(64) })).rejects.toThrow("different checkout");
    await expect(store.beginAttempt(input("locked_owner", "checkout_key_0002"))).rejects.toThrow("unresolved funding attempt");
  });
  it("persists ambiguity and blocks duplicates after a process restart", async () => {
    const { attempt } = await store.beginAttempt(input("restart_owner"));
    await store.markUncertain(attempt.id, "restart_owner");
    const restartedPool = new Pool({ connectionString: database });
    try {
      const restarted = new FundingStore(restartedPool);
      expect((await restarted.findAttempt("restart_owner", "hosted", "checkout_key_0001"))?.state).toBe("uncertain");
      await expect(restarted.beginAttempt(input("restart_owner", "checkout_key_0002"))).rejects.toThrow("unresolved funding attempt");
    } finally { await restartedPool.end(); }
  });
  it("never overwrites a committed result on a lost acknowledgement", async () => {
    const { attempt } = await store.beginAttempt(input("committed_owner"));
    await store.completeAttempt(attempt.id, "committed_owner", "encrypted-value", new Date(Date.now()+300_000));
    await store.markUncertain(attempt.id, "committed_owner");
    expect((await store.getAttempt(attempt.id, "committed_owner"))?.state).toBe("ready");
    expect(await store.getAttempt(attempt.id, "other_owner")).toBeNull();
    await expect(store.completeAttempt(attempt.id, "other_owner", "replacement", new Date())).rejects.toThrow();
  });
  it("paginates equal-timestamp rows deterministically without another owner's cursor", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const { attempt } = await store.beginAttempt(input("history_owner", `history_key_000${i}`));
      await store.completeAttempt(attempt.id, "history_owner", "ciphertext", new Date(Date.now()+300_000));
      ids.push(attempt.id);
    }
    await pool.query("UPDATE funding_attempts SET created_at='2026-01-01' WHERE user_id='history_owner'");
    const first = await store.history("history_owner", 2);
    const second = await store.history("history_owner", 2, first[1].id);
    expect([...first,...second].map(row => row.id)).toEqual(ids.sort().reverse());
    expect(await store.history("other_owner", 2, first[1].id)).toEqual([]);
  });
  it("denies browser roles access to checkout secrets", async () => {
    const client = await pool.connect();
    try {
      for (const role of ["anon", "authenticated"]) {
        await client.query(`SET ROLE ${role}`);
        await expect(client.query("SELECT * FROM funding_attempts")).rejects.toThrow("permission denied");
        await client.query("RESET ROLE");
      }
      await client.query("SET ROLE service_role");
      expect((await client.query("SELECT * FROM funding_attempts")).rowCount).toBeGreaterThan(0);
    } finally { await client.query("RESET ROLE"); client.release(); }
  });
});

describe.skipIf(!database)("durable webhook replay identity", () => {
  const pool = new Pool({ connectionString: database });
  afterAll(async () => { await pool.end(); });
  it("enqueues exactly once across concurrent writers and rejects identity collisions", async () => {
    const inbox = new PostgresWebhookInbox(pool);
    const results = await Promise.all(Array.from({length:8}, () => inbox.enqueue("delivery-1","onramp.updated","a".repeat(64),Buffer.from("{}"))));
    expect(results.filter(Boolean)).toHaveLength(1);
    const restartedPool = new Pool({connectionString:database});
    try { expect(await new PostgresWebhookInbox(restartedPool).enqueue("delivery-1","onramp.updated","a".repeat(64),Buffer.from("{}"))).toBe(false); }
    finally { await restartedPool.end(); }
    await expect(inbox.enqueue("delivery-1","onramp.updated","b".repeat(64),Buffer.from("different"))).rejects.toThrow("collision");
    await expect(inbox.enqueue("delivery-1","different","a".repeat(64),Buffer.from("{}"))).rejects.toThrow("collision");
  });
  it("keeps authenticated provider bytes private from browser roles", async () => {
    const client=await pool.connect();
    try { await client.query("SET ROLE authenticated"); await expect(client.query("SELECT raw_body FROM funding_webhook_inbox")).rejects.toThrow("permission denied"); }
    finally { await client.query("RESET ROLE"); client.release(); }
  });
});

describe.skipIf(!database)("funding event processing", () => {
  const pool=new Pool({connectionString:database});
  const store=new FundingStore(pool);
  afterAll(async()=>{await pool.end();});
  const wallet="0x00000000000000000000000000000000000000aa";
  async function fixture(userId:string) {
    const {attempt}=await store.beginAttempt({userId,kind:"hosted",key:"processor_request",fingerprint:"a".repeat(64),wallet,chainId:8453,sandbox:true});
    const event={eventType:"onramp.transaction.updated",transactionId:crypto.randomUUID(),partnerUserRef:attempt.provider_user_ref,
      walletAddress:wallet,purchaseCurrency:"USDC",purchaseNetwork:"base",purchaseAmount:{currency:"USDC",value:"10.000001"},
      createdAt:"2026-10-27T00:00:00Z",status:"ONRAMP_TRANSACTION_STATUS_IN_PROGRESS"};
    return {attempt,event};
  }
  async function enqueue(id:string,event:unknown) {
    const raw=Buffer.from(JSON.stringify(event));
    await new PostgresWebhookInbox(pool).enqueue(id,"onramp.transaction.updated",createHash("sha256").update(raw).digest("hex"),raw);
  }
  async function drain() {
    for(let i=0;i<30;i++) if(await new FundingProcessor(pool,{getOrder:async()=>{throw new Error("not headless");}}).runOne()==="idle") break;
  }
  it("processes exactly once across simultaneous workers and persists restart-visible status",async()=>{
    // Quarantine unrelated prior inbox fixtures to isolate this worker proof.
    await pool.query("UPDATE funding_webhook_inbox SET quarantined_at=now() WHERE processed_at IS NULL");
    const {attempt,event}=await fixture("worker_owner"); await enqueue("worker_event",event);
    const worker=new FundingProcessor(pool,{getOrder:async()=>{throw new Error("not used");}});
    const results=await Promise.all([worker.runOne(),worker.runOne()]);
    expect(results.sort()).toEqual(["idle","processed"]);
    const restarted=new Pool({connectionString:database});
    try {
      const row=await new FundingStore(restarted).getAttempt(attempt.id,"worker_owner");
      expect(row?.provider_status).toBe("ONRAMP_ORDER_STATUS_PROCESSING"); expect(row?.state).toBe("ready");
      expect((await restarted.query("SELECT attempts,processed_at FROM funding_webhook_inbox WHERE event_id='worker_event'")).rows[0]).toMatchObject({attempts:1,processed_at:expect.any(Date)});
    } finally {await restarted.end();}
  });
  it("handles failure, late completion and reordered pending without claiming credit",async()=>{
    const {attempt,event}=await fixture("lifecycle_owner");
    for(const [id,status] of [["life1","ONRAMP_TRANSACTION_STATUS_FAILED"],["life2","ONRAMP_TRANSACTION_STATUS_SUCCESS"],["life3","ONRAMP_TRANSACTION_STATUS_IN_PROGRESS"]]) {
      await enqueue(id,{...event,status}); await drain();
    }
    expect((await store.getAttempt(attempt.id,"lifecycle_owner"))?.provider_status).toBe("ONRAMP_ORDER_STATUS_COMPLETED");
    expect((await pool.query("SELECT provider_transaction_id FROM funding_attempts WHERE id=$1",[attempt.id])).rows[0].provider_transaction_id).toBe(event.transactionId);
  });
  it("keeps poisoned/unknown events durable, retries then quarantines without leaking payloads",async()=>{
    await enqueue("unknown_event",{eventType:"onramp.transaction.updated",partnerUserRef:"unknown",secret:"never log this"});
    for(let i=0;i<8;i++) {
      await pool.query("UPDATE funding_webhook_inbox SET next_attempt_at=now() WHERE event_id='unknown_event'");
      await drain();
    }
    const row=(await pool.query("SELECT * FROM funding_webhook_inbox WHERE event_id='unknown_event'")).rows[0];
    expect(row.quarantined_at).toBeInstanceOf(Date); expect(row.processed_at).toBeNull(); expect(row.attempts).toBe(8);
    expect(row.last_error).toBe("unmatched_attempt"); expect(row.raw_body.toString()).toContain("never log this");
  });
  it("rolls back identity mismatches and preserves the unresolved reservation",async()=>{
    const {attempt,event}=await fixture("mismatch_owner"); await enqueue("mismatch_event",{...event,walletAddress:"0x00000000000000000000000000000000000000bb"});
    await drain(); expect((await store.getAttempt(attempt.id,"mismatch_owner"))?.state).toBe("creating");
    expect((await pool.query("SELECT processed_at,last_error FROM funding_webhook_inbox WHERE event_id='mismatch_event'")).rows[0]).toEqual({processed_at:null,last_error:"identity_mismatch"});
  });
  it("fetches canonical headless status and commits it atomically with inbox completion",async()=>{
    await pool.query("UPDATE funding_webhook_inbox SET quarantined_at=now() WHERE processed_at IS NULL");
    const quote=await store.insertQuote({userId:"headless_worker",wallet,chainId:8453,token:BASE_USDC,paymentMethod:"GUEST_CHECKOUT_APPLE_PAY",requestAmount:"10",amountKind:"purchase",sandbox:true,
      quote:{paymentTotal:"10",paymentSubtotal:"10",paymentCurrency:"USD",purchaseAmount:"10",purchaseCurrency:"USDC",destinationAddress:wallet,destinationNetwork:"base",fees:[]}});
    const {attempt}=await store.beginAttempt({userId:"headless_worker",kind:"headless",key:"headless_key_0001",fingerprint:"a".repeat(64),quoteId:quote.id,wallet,chainId:8453,sandbox:true});
    const orderId=crypto.randomUUID();
    await enqueue("headless_event",{eventType:"onramp.transaction.updated",orderId,partnerUserRef:attempt.provider_user_ref,status:"FORGED_BODY_STATE"});
    let calls=0;
    const worker=new FundingProcessor(pool,{getOrder:async(id)=>{calls++;expect(id).toBe(orderId);return {
      orderId,partnerUserRef:attempt.provider_user_ref!,status:"ONRAMP_ORDER_STATUS_COMPLETED",updatedAt:"2026-10-27T01:00:00Z",
      destinationAddress:wallet,destinationNetwork:"base",purchaseCurrency:"USDC",purchaseAmount:"10",paymentCurrency:"USD",paymentTotal:"10",paymentSubtotal:"10",fees:[]};}});
    expect(await worker.runOne()).toBe("processed");expect(calls).toBe(1);
    const saved=await store.getAttempt(attempt.id,"headless_worker");expect(saved?.provider_status).toBe("ONRAMP_ORDER_STATUS_COMPLETED");expect(saved?.provider_order_id).toBe(orderId);
    expect(await worker.runOne()).toBe("idle");
  });

});
