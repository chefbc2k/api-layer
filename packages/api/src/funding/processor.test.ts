import { describe,expect,it,vi } from "vitest";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { FundingProcessor } from "./processor.js";
import type { CoinbaseFundingProvider } from "./provider.js";
import { assertHeadlessOrderValue, assertObservationTimestamp, chooseStatus } from "./processor.js";
import type { CoinbaseOrder } from "./provider.js";
const t=new Date("2026-10-27T00:00:00Z"),later=new Date(t.getTime()+1000),earlier=new Date(t.getTime()-1000);
const s=(value:string)=>`ONRAMP_ORDER_STATUS_${value}`;
describe("funding lifecycle ordering",()=>{
  it("accepts progress and failure without accepting pending regressions",()=>{
    expect(chooseStatus(s("PROCESSING"),s("FAILED"),t,later)).toBe(s("FAILED"));
    expect(chooseStatus(s("PROCESSING"),s("PENDING_PAYMENT"),t,later)).toBeNull();
    expect(chooseStatus(s("FAILED"),s("PROCESSING"),t,later)).toBeNull();
  });
  it("rejects stale data and preserves completion",()=>{
    expect(chooseStatus(s("PROCESSING"),s("FAILED"),t,earlier)).toBeNull();
    expect(chooseStatus(s("COMPLETED"),s("FAILED"),t,later)).toBeNull();
  });
  it("accepts late completion after failure including equal timestamp tie",()=>{
    expect(chooseStatus(s("FAILED"),s("COMPLETED"),t,later)).toBe(s("COMPLETED"));
    expect(chooseStatus(s("FAILED"),s("COMPLETED"),t,t)).toBe(s("COMPLETED"));
  });
  it.each([
    [null,"PAID"],
    ["ONRAMP_ORDER_STATUS_REFUNDED",s("PROCESSING")],
    ["ONRAMP_ORDER_STATUS_COMPLETED_SUFFIX",s("COMPLETED")],
  ])("fails closed for unknown persisted or incoming states %#",(previous,next)=>
    expect(()=>chooseStatus(previous,next,null,t)).toThrow("unsupported_status"));
  it("rejects future observations before they can pin the state machine",()=>{
    expect(()=>assertObservationTimestamp(new Date(t.getTime()+300_000),t)).not.toThrow();
    expect(()=>assertObservationTimestamp(new Date(t.getTime()+300_001),t)).toThrow("invalid_timestamp");
    expect(()=>assertObservationTimestamp(new Date("invalid"),t)).toThrow("invalid_timestamp");
  });
  it.each([
    ["purchase","9.999999",{}],
    ["purchase","10.000000",{purchaseAmount:"-10"}],
    ["payment","10.750000",{paymentTotal:"10.76"}],
    ["payment","10.750000",{fees:[{type:"fee",amount:"0.74",currency:"USD"}]}],
    ["bogus","10.000000",{}],
  ])("rejects mutated headless value conservation %#",(amountKind,requestAmount,patch)=>{
    const order={orderId:"00000000-0000-4000-8000-000000000001",partnerUserRef:"customer",status:s("PROCESSING"),updatedAt:t.toISOString(),
      destinationAddress:"0x00000000000000000000000000000000000000aa",destinationNetwork:"base",purchaseCurrency:"USDC",purchaseAmount:"10.000000",
      paymentCurrency:"USD",paymentSubtotal:"10.000000",paymentTotal:"10.750000",fees:[{type:"fee",amount:"0.750000",currency:"USD"}],...patch} as CoinbaseOrder;
    expect(()=>assertHeadlessOrderValue(order,amountKind,requestAmount)).toThrow("invalid_amount");
  });
  it.each([["purchase","10.000000"],["payment","10.750000"]])("accepts conserved %s observations",(amountKind,requestAmount)=>{
    const order={orderId:"00000000-0000-4000-8000-000000000001",partnerUserRef:"customer",status:s("PROCESSING"),updatedAt:t.toISOString(),
      destinationAddress:"0x00000000000000000000000000000000000000aa",destinationNetwork:"base",purchaseCurrency:"USDC",purchaseAmount:"10.000000",
      paymentCurrency:"USD",paymentSubtotal:"10.000000",paymentTotal:"10.750000",fees:[{type:"fee",amount:"0.750000",currency:"USD"}]} as CoinbaseOrder;
    expect(()=>assertHeadlessOrderValue(order,amountKind,requestAmount)).not.toThrow();
  });
});

const webhookAttemptId = "33333333-3333-4333-8333-333333333333";
const webhookTransactionId = "44444444-4444-4444-8444-444444444444";
const webhookOrderId = "55555555-5555-4555-8555-555555555555";
const webhookWallet = "0x00000000000000000000000000000000000000aa";
const webhookTxHash = `0x${"c".repeat(64)}`;
const webhookEvent = (patch: Record<string, unknown> = {}) => ({
  eventType: "onramp.transaction.success", transactionId: webhookTransactionId,
  partnerUserRef: "user-ref", walletAddress: webhookWallet, purchaseCurrency: "USDC",
  purchaseNetwork: "base", purchaseAmount: { currency: "USDC", value: "10" },
  createdAt: new Date().toISOString(), status: "ONRAMP_TRANSACTION_STATUS_SUCCESS", txHash: webhookTxHash,
  ...patch,
});
const webhookRow = (event: unknown, patch: Record<string, unknown> = {}) => ({
  event_id: "event-id", event_type: "onramp.transaction.success", raw_body: Buffer.from(JSON.stringify(event)),
  attempts: 0, received_at: new Date(), ...patch,
});
const webhookAttempt = (patch: Record<string, unknown> = {}) => ({
  id: webhookAttemptId, user_id: "user-id", kind: "hosted", sandbox: true, provider_user_ref: "user-ref",
  provider_order_id: null, provider_transaction_id: null, provider_status: null, provider_updated_at: null,
  provider_tx_hash: null, expected_usdc_units: null, settlement_status: "unverified", wallet_address: webhookWallet,
  quote_amount_kind: "purchase", quote_request_amount: "10", ...patch,
});
function processorHarness(event: unknown, attempt: Record<string, unknown> | null, rowPatch: Record<string, unknown> = {}, options: { beginError?: Error; rollbackError?: Error } = {}) {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  const client = {
    query: vi.fn(async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      if (sql === "BEGIN" && options.beginError) throw options.beginError;
      if (sql === "ROLLBACK" && options.rollbackError) throw options.rollbackError;
      if (sql.startsWith("SELECT * FROM funding_webhook_inbox")) return { rows: event === null ? [] : [webhookRow(event, rowPatch)], rowCount: event === null ? 0 : 1 };
      if (sql.startsWith("SELECT a.*")) return { rows: attempt ? [attempt] : [], rowCount: attempt ? 1 : 0 };
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as Pool;
  const provider = { getOrder: vi.fn() } as unknown as CoinbaseFundingProvider;
  return { worker: new FundingProcessor(pool, provider), provider, client, queries };
}

describe("FundingProcessor webhook worker", () => {
  it("commits idle inbox work and releases its client", async () => {
    const { worker, client } = processorHarness(null, null);
    await expect(worker.runOne()).resolves.toBe("idle");
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", expect.stringContaining("funding_webhook_inbox"), "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("processes a valid hosted transaction and persists the receipt evidence", async () => {
    const { worker, client } = processorHarness(webhookEvent(), webhookAttempt());
    await expect(worker.runOne()).resolves.toBe("processed");
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("processed_at=now()"))).toBe(true);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
  });

  it.each([
    { eventType: "onramp.transaction.failed" },
    { eventType: "onramp.transaction.success" },
  ])("processes matching hosted events with explicit event type $eventType", async patch => {
    const event = webhookEvent(patch);
    const { worker } = processorHarness(event, webhookAttempt(), { event_type: event.eventType });
    await expect(worker.runOne()).resolves.toBe("processed");
  });

  it("uses a valid provider order for a headless event", async () => {
    const event = webhookEvent({ eventType: "onramp.transaction.updated", orderId: webhookOrderId, status: "ONRAMP_ORDER_STATUS_PROCESSING" });
    const order = {
      orderId: webhookOrderId, partnerUserRef: "user-ref", status: "ONRAMP_ORDER_STATUS_PROCESSING",
      updatedAt: new Date().toISOString(), destinationAddress: webhookWallet,
      destinationNetwork: "base", purchaseCurrency: "USDC", purchaseAmount: "10", paymentCurrency: "USD",
      paymentSubtotal: "10", paymentTotal: "10", fees: [],
    };
    const { worker, provider } = processorHarness(event, webhookAttempt({ kind: "headless", provider_order_id: null }), { event_type: "onramp.transaction.updated" });
    vi.mocked(provider.getOrder).mockResolvedValueOnce(order as never);
    await expect(worker.runOne()).resolves.toBe("processed");
    expect(provider.getOrder).toHaveBeenCalledWith(webhookOrderId);
  });

  it("rejects a provider order with a mismatched partner identity", async () => {
    const event = webhookEvent({ eventType: "onramp.transaction.updated", orderId: webhookOrderId });
    const order = {
      orderId: webhookOrderId, partnerUserRef: "different-user", status: "ONRAMP_ORDER_STATUS_PROCESSING",
      updatedAt: new Date().toISOString(), destinationAddress: webhookWallet,
      destinationNetwork: "base", purchaseCurrency: "USDC", purchaseAmount: "10", paymentCurrency: "USD",
      paymentSubtotal: "10", paymentTotal: "10", fees: [],
    };
    const { worker, provider } = processorHarness(event, webhookAttempt({ kind: "headless" }), { event_type: "onramp.transaction.updated" });
    vi.mocked(provider.getOrder).mockResolvedValueOnce(order as never);
    await expect(worker.runOne()).resolves.toBe("retry");
  });

  it("reconstructs legacy provider references and rejects mismatched identities", async () => {
    const legacyRef = `sandbox-${createHash("sha256").update("uspeaks:user-id").digest("hex").slice(0, 32)}`;
    const legacyEvent = webhookEvent({ partnerUserRef: legacyRef });
    const legacy = processorHarness(legacyEvent, webhookAttempt({ provider_user_ref: null }));
    await expect(legacy.worker.runOne()).resolves.toBe("processed");
    const mismatch = processorHarness(webhookEvent({ partnerUserRef: "another-user" }), webhookAttempt());
    await expect(mismatch.worker.runOne()).resolves.toBe("retry");
    const noLegacy = processorHarness(webhookEvent(), webhookAttempt({ provider_user_ref: null, sandbox: false }));
    await expect(noLegacy.worker.runOne()).resolves.toBe("retry");
  });

  it("rejects headless order ownership and hosted transaction wallet mismatches", async () => {
    const orderEvent = webhookEvent({ eventType: "onramp.transaction.updated", orderId: webhookOrderId });
    const wrongKind = processorHarness(orderEvent, webhookAttempt({ kind: "hosted" }), { event_type: "onramp.transaction.updated" });
    await expect(wrongKind.worker.runOne()).resolves.toBe("retry");
    const oldOrder = processorHarness(orderEvent, webhookAttempt({ kind: "headless", provider_order_id: "66666666-6666-4666-8666-666666666666" }), { event_type: "onramp.transaction.updated" });
    await expect(oldOrder.worker.runOne()).resolves.toBe("retry");
    const wrongWallet = processorHarness(webhookEvent({ walletAddress: "0x00000000000000000000000000000000000000bb" }), webhookAttempt());
    await expect(wrongWallet.worker.runOne()).resolves.toBe("retry");
    const wrongTransaction = processorHarness(webhookEvent(), webhookAttempt({ provider_transaction_id: "66666666-6666-4666-8666-666666666666" }));
    await expect(wrongTransaction.worker.runOne()).resolves.toBe("retry");
  });

  it.each([
    ["ONRAMP_TRANSACTION_STATUS_CREATED", "ONRAMP_ORDER_STATUS_PENDING_PAYMENT"],
    ["ONRAMP_TRANSACTION_STATUS_IN_PROGRESS", "ONRAMP_ORDER_STATUS_PROCESSING"],
    ["ONRAMP_TRANSACTION_STATUS_FAILED", "ONRAMP_ORDER_STATUS_FAILED"],
  ])("maps provider transaction status %s to %s", async (transactionStatus, expectedStatus) => {
    const { worker, client } = processorHarness(webhookEvent({ status: transactionStatus }), webhookAttempt());
    await expect(worker.runOne()).resolves.toBe("processed");
    const write = client.query.mock.calls.find(([sql]) => String(sql).includes("provider_status=$2"));
    expect(write?.[1]?.[1]).toBe(expectedStatus);
  });

  it("uses a valid completion date and ignores provider hashes that are missing or malformed", async () => {
    const completed = processorHarness(webhookEvent({ completedAt: new Date().toISOString(), txHash: undefined }), webhookAttempt());
    await expect(completed.worker.runOne()).resolves.toBe("processed");
    const sentinel = processorHarness(webhookEvent({ completedAt: "0001-01-01T00:00:00.000Z", txHash: "not-a-hash" }), webhookAttempt());
    await expect(sentinel.worker.runOne()).resolves.toBe("processed");
  });

  it("detects settlement amount and transaction hash changes", async () => {
    const amount = processorHarness(webhookEvent(), webhookAttempt({ settlement_status: "verified", expected_usdc_units: "11000000" }));
    await expect(amount.worker.runOne()).resolves.toBe("retry");
    const hash = processorHarness(webhookEvent(), webhookAttempt({ settlement_status: "verified", provider_tx_hash: `0x${"d".repeat(64)}` }));
    await expect(hash.worker.runOne()).resolves.toBe("retry");
  });

  it("does not regress completed status and refreshes a repeated completion", async () => {
    const regression = processorHarness(webhookEvent({ status: "ONRAMP_TRANSACTION_STATUS_FAILED" }), webhookAttempt({ provider_status: "ONRAMP_ORDER_STATUS_COMPLETED", provider_updated_at: new Date() }));
    await expect(regression.worker.runOne()).resolves.toBe("processed");
    expect(regression.client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(false);
    const repeat = processorHarness(webhookEvent(), webhookAttempt({ provider_status: "ONRAMP_ORDER_STATUS_COMPLETED", provider_updated_at: new Date() }));
    await expect(repeat.worker.runOne()).resolves.toBe("processed");
    expect(repeat.client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(true);
  });

  it.each([
    { eventType: "unsupported", error: "unsupported_event" },
    { eventType: "onramp.transaction.success", attempt: null, error: "unmatched_attempt" },
    { eventType: "onramp.transaction.success", attemptPatch: { kind: "headless" }, error: "identity_mismatch" },
    { eventType: "onramp.transaction.success", eventPatch: { purchaseAmount: { currency: "USDC", value: "0" } }, error: "invalid_amount" },
  ])("rejects unsafe webhook input and records a fixed error category", async ({ eventType, attempt: expectedAttempt, attemptPatch, eventPatch, error }) => {
    const event = webhookEvent({ eventType, ...eventPatch });
    const attempt = expectedAttempt === null ? null : webhookAttempt(attemptPatch);
    const { worker, client } = processorHarness(event, attempt, { event_type: "onramp.transaction.success" });
    await expect(worker.runOne()).resolves.toBe("retry");
    const errorWrite = client.query.mock.calls.find(([sql]) => String(sql).includes("last_error=$3"));
    expect(errorWrite?.[1]?.[2]).toBe(error);
  });

  it("quarantines repeated failures and never stores provider error text", async () => {
    const sensitive = new Error("private provider response");
    const { worker, provider, client } = processorHarness(webhookEvent({ eventType: "onramp.transaction.updated", orderId: webhookOrderId }), webhookAttempt({ kind: "headless" }), { attempts: 7, event_type: "onramp.transaction.updated" });
    vi.mocked(provider.getOrder).mockRejectedValueOnce(sensitive);
    await expect(worker.runOne()).resolves.toBe("quarantined");
    const errorWrite = client.query.mock.calls.find(([sql]) => String(sql).includes("last_error=$3"));
    expect(errorWrite?.[1]?.[2]).toBe("processing_failed");
    expect(JSON.stringify(client.query.mock.calls)).not.toContain("private provider response");
  });

  it("rolls back and rethrows failures outside an individual event", async () => {
    const failure = new Error("database unavailable");
    const { worker, client } = processorHarness(null, null);
    client.query.mockImplementationOnce(async () => { throw failure; });
    await expect(worker.runOne()).rejects.toBe(failure);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("suppresses rollback failure without replacing the transaction error", async () => {
    const failure = new Error("transaction failed");
    const { worker, client } = processorHarness(null, null, {}, { beginError: failure, rollbackError: new Error("rollback failed") });
    await expect(worker.runOne()).rejects.toBe(failure);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
