import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { FundingReconciler, validateHealthSettings } from "./reconciliation.js";
import type { CoinbaseFundingProvider } from "./provider.js";

const subscriptionId = "11111111-1111-4111-8111-111111111111";
const transactionId = "22222222-2222-4222-8222-222222222222";
const txHash = `0x${"a".repeat(64)}`;
const requiredEvents = ["onramp.transaction.created", "onramp.transaction.updated", "onramp.transaction.success", "onramp.transaction.failed"];
const baseAttempt = (patch: Record<string, unknown> = {}) => ({
  id: "attempt-id", user_id: "user-id", kind: "hosted", fingerprint: "fingerprint", sandbox: true,
  wallet_address: "0x00000000000000000000000000000000000000aa", chain_id: "84532", state: "uncertain",
  provider_user_ref: "sandbox-ref", provider_order_id: null, provider_transaction_id: null,
  provider_status: null, provider_updated_at: null, provider_tx_hash: null, expected_usdc_units: null,
  settlement_status: "unverified", quote_amount_kind: "purchase", quote_request_amount: "10",
  reconcile_error: null, reconcile_page_key: null, reconcile_seen_keys: [], reconcile_candidates: [],
  reconcile_attempts: 0, created_at: new Date(Date.now() - 1_000), ...patch,
});
const baseTransaction = (patch: Record<string, unknown> = {}) => ({
  transaction_id: transactionId, partner_user_ref: "sandbox-ref",
  wallet_address: "0x00000000000000000000000000000000000000aa", purchase_currency: "USDC",
  purchase_network: "base", purchase_amount: { currency: "USDC", value: "10" },
  payment_total: { currency: "USD", value: "10" }, created_at: new Date().toISOString(),
  status: "ONRAMP_TRANSACTION_STATUS_SUCCESS", tx_hash: txHash, ...patch,
});
const baseOrder = (patch: Record<string, unknown> = {}) => ({
  orderId: subscriptionId, partnerUserRef: "sandbox-ref", status: "ONRAMP_ORDER_STATUS_COMPLETED",
  updatedAt: new Date().toISOString(), destinationAddress: "0x00000000000000000000000000000000000000aa",
  destinationNetwork: "base", purchaseCurrency: "USDC", purchaseAmount: "10", paymentCurrency: "USD",
  paymentSubtotal: "10", paymentTotal: "10", fees: [], ...patch,
});

function harness(attempt?: Record<string, unknown>, options: { selectError?: Error; rollbackError?: Error } = {}) {
  const calls: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      calls.push(sql);
      if (sql === "ROLLBACK" && options.rollbackError) throw options.rollbackError;
      if (sql.startsWith("SELECT a.*")) {
        if (options.selectError) throw options.selectError;
        return { rows: attempt ? [attempt] : [], rowCount: attempt ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  };
  const pool = { connect: vi.fn().mockResolvedValue(client), query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }) } as unknown as Pool;
  const provider = {
    subscription: vi.fn(), transactions: vi.fn().mockResolvedValue({ transactions: [] }), getOrder: vi.fn(),
  } as unknown as CoinbaseFundingProvider;
  return { worker: new FundingReconciler(pool, provider), provider, pool, client, calls };
}

describe("FundingReconciler", () => {
  it("validates webhook URL and subscription identifiers", () => {
    expect(() => validateHealthSettings({ subscriptionId, webhookUrl: "https://api.example/v1/webhooks/coinbase/onramp" })).not.toThrow();
    expect(() => validateHealthSettings({ subscriptionId: "not-a-uuid" })).toThrow();
    for (const webhookUrl of [
      "http://api.example/v1/webhooks/coinbase/onramp",
      "https://user:secret@api.example/v1/webhooks/coinbase/onramp",
      "https://api.example/v1/webhooks/coinbase/onramp?token=x",
      "https://api.example/v1/webhooks/coinbase/onramp#fragment",
      "https://api.example/elsewhere",
    ]) expect(() => validateHealthSettings({ webhookUrl })).toThrow("Invalid funding webhook URL");
  });

  it("reports and persists unconfigured, healthy, mismatch, disabled and unavailable subscriptions", async () => {
    const { worker, provider, pool } = harness();
    await expect(worker.checkHealth({})).resolves.toBe("unconfigured");
    expect(provider.subscription).not.toHaveBeenCalled();
    vi.mocked(provider.subscription).mockResolvedValue({
      subscriptionId, isEnabled: true, eventTypes: requiredEvents,
      target: { url: "https://api.example/v1/webhooks/coinbase/onramp", method: "POST" },
    } as never);
    const settings = { subscriptionId, webhookUrl: "https://api.example/v1/webhooks/coinbase/onramp" };
    await expect(worker.checkHealth(settings)).resolves.toBe("healthy");
    vi.mocked(provider.subscription).mockResolvedValueOnce({ subscriptionId, isEnabled: false, eventTypes: requiredEvents, target: { url: settings.webhookUrl } } as never);
    await expect(worker.checkHealth(settings)).resolves.toBe("disabled");
    vi.mocked(provider.subscription).mockResolvedValueOnce({ subscriptionId, isEnabled: true, eventTypes: [], target: { url: "https://other.example/hook" } } as never);
    await expect(worker.checkHealth(settings)).resolves.toBe("mismatch");
    vi.mocked(provider.subscription).mockRejectedValueOnce(new Error("private provider detail"));
    await expect(worker.checkHealth(settings)).resolves.toBe("unavailable");
    expect(pool.query).toHaveBeenCalledTimes(5);
  });

  it("commits idle work and releases its database client", async () => {
    const { worker, client } = harness();
    await expect(worker.runOne()).resolves.toBe("idle");
    expect(client.query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", expect.stringContaining("SELECT a.*"), "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("reconciles a matching hosted transaction and persists its status, identity and amount", async () => {
    const { worker, provider, client } = harness(baseAttempt());
    vi.mocked(provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(worker.runOne()).resolves.toBe("updated");
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(true);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("continues one provider page and records its seen cursor", async () => {
    const { worker, provider, client } = harness(baseAttempt({ reconcile_seen_keys: ["first"] }));
    vi.mocked(provider.transactions).mockResolvedValueOnce({ transactions: [], next_page_key: "second" } as never);
    await expect(worker.runOne()).resolves.toBe("page");
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("reconcile_page_key=$2"))).toBe(true);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
  });

  it.each([
    { reconcile_page_key: "second", reconcile_seen_keys: [] },
    { reconcile_page_key: null, reconcile_seen_keys: ["second"] },
    { reconcile_page_key: null, reconcile_seen_keys: Array.from({ length: 100 }, (_, i) => `key-${i}`) },
  ])("detects pagination cycles and asks for attention", async patch => {
    const { worker, provider, client } = harness(baseAttempt(patch));
    vi.mocked(provider.transactions).mockResolvedValueOnce({ transactions: [], next_page_key: patch.reconcile_page_key ?? (patch.reconcile_seen_keys.length === 100 ? "new" : "second") } as never);
    await expect(worker.runOne()).resolves.toBe("attention");
    expect(client.query.mock.calls.some(([sql]) => sql === "ROLLBACK TO SAVEPOINT reconcile_attempt")).toBe(true);
  });

  it("waits for a provider-visible transaction, then escalates overdue visibility", async () => {
    const { worker, provider } = harness(baseAttempt());
    await expect(worker.runOne()).resolves.toBe("waiting");
    const overdue = harness(baseAttempt({ created_at: new Date(Date.now() - 25 * 60 * 60_000) }));
    vi.mocked(overdue.provider.transactions).mockResolvedValueOnce({ transactions: [] } as never);
    await expect(overdue.worker.runOne()).resolves.toBe("attention");
    expect(provider.transactions).toHaveBeenCalledOnce();
  });

  it("requires provider identity for legacy attempts and catches invalid provider data", async () => {
    const legacy = harness(baseAttempt({ provider_user_ref: null }));
    await expect(legacy.worker.runOne()).resolves.toBe("attention");
    const nonsandboxLegacy = harness(baseAttempt({ provider_user_ref: null, sandbox: false }));
    await expect(nonsandboxLegacy.worker.runOne()).resolves.toBe("attention");
    const mismatched = harness(baseAttempt());
    vi.mocked(mismatched.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ partner_user_ref: "other" })] } as never);
    await expect(mismatched.worker.runOne()).resolves.toBe("attention");
    const duplicate = harness(baseAttempt());
    vi.mocked(duplicate.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction(), baseTransaction({ transaction_id: "33333333-3333-4333-8333-333333333333" })] } as never);
    await expect(duplicate.worker.runOne()).resolves.toBe("attention");
  });

  it("rejects amount and transaction identity conflicts", async () => {
    const invalidAmount = harness(baseAttempt());
    vi.mocked(invalidAmount.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ purchase_amount: { currency: "USDC", value: "0" } })] } as never);
    await expect(invalidAmount.worker.runOne()).resolves.toBe("attention");
    const priorTransaction = harness(baseAttempt({ provider_transaction_id: "33333333-3333-4333-8333-333333333333" }));
    vi.mocked(priorTransaction.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(priorTransaction.worker.runOne()).resolves.toBe("attention");
  });

  it("classifies provider failures as retry until the attempt limit", async () => {
    const { worker, provider } = harness(baseAttempt({ reconcile_attempts: 0 }));
    vi.mocked(provider.transactions).mockRejectedValueOnce(new Error("sensitive provider response"));
    await expect(worker.runOne()).resolves.toBe("retry");
    const exhausted = harness(baseAttempt({ reconcile_attempts: 7 }));
    vi.mocked(exhausted.provider.transactions).mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(exhausted.worker.runOne()).resolves.toBe("attention");
  });

  it("rolls back and rethrows failures outside one attempt, then releases the client", async () => {
    const failure = new Error("database failed");
    const { worker, client } = harness(undefined, { selectError: failure });
    await expect(worker.runOne()).rejects.toBe(failure);
    expect(client.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("follows order ids, verifies the order and reports source validation failures", async () => {
    const orderId = subscriptionId;
    const orderAttempt = baseAttempt({ kind: "headless", provider_user_ref: "sandbox-ref", provider_order_id: orderId, quote_amount_kind: "purchase", quote_request_amount: "10" });
    const order = {
      orderId, partnerUserRef: "sandbox-ref", status: "ONRAMP_ORDER_STATUS_COMPLETED",
      updatedAt: new Date().toISOString(), destinationAddress: orderAttempt.wallet_address,
      destinationNetwork: "base", purchaseCurrency: "USDC", purchaseAmount: "10", paymentCurrency: "USD",
      paymentSubtotal: "10", paymentTotal: "10", fees: [], txHash,
    };
    const { worker, provider, client } = harness(orderAttempt);
    vi.mocked(provider.getOrder).mockResolvedValueOnce(order as never);
    await expect(worker.runOne()).resolves.toBe("updated");
    expect(provider.getOrder).toHaveBeenCalledWith(orderId);
    const bad = harness(orderAttempt);
    vi.mocked(bad.provider.getOrder).mockRejectedValueOnce(new Error("provider offline"));
    await expect(bad.worker.runOne()).resolves.toBe("retry");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rejects mismatched order identities and missing update timestamps", async () => {
    const orderAttempt = baseAttempt({ kind: "headless", provider_order_id: subscriptionId });
    const identityMismatch = harness(orderAttempt);
    vi.mocked(identityMismatch.provider.getOrder).mockResolvedValueOnce(baseOrder({ destinationAddress: "0x00000000000000000000000000000000000000bb" }) as never);
    await expect(identityMismatch.worker.runOne()).resolves.toBe("attention");
    const missingTimestamp = harness(orderAttempt);
    vi.mocked(missingTimestamp.provider.getOrder).mockResolvedValueOnce(baseOrder({ updatedAt: undefined }) as never);
    await expect(missingTimestamp.worker.runOne()).resolves.toBe("attention");
    const optionalHash = harness(orderAttempt);
    vi.mocked(optionalHash.provider.getOrder).mockResolvedValueOnce(baseOrder({ txHash: undefined }) as never);
    await expect(optionalHash.worker.runOne()).resolves.toBe("updated");
  });

  it("rejects stale hosted transaction observations and uses valid completion timestamps", async () => {
    const stale = harness(baseAttempt());
    vi.mocked(stale.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ created_at: new Date(Date.now() - 10 * 60_000).toISOString() })] } as never);
    await expect(stale.worker.runOne()).resolves.toBe("attention");
    const completed = harness(baseAttempt());
    vi.mocked(completed.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ completed_at: new Date().toISOString() })] } as never);
    await expect(completed.worker.runOne()).resolves.toBe("updated");
    const invalidHash = harness(baseAttempt());
    vi.mocked(invalidHash.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ tx_hash: "provider-returned-non-hash" })] } as never);
    await expect(invalidHash.worker.runOne()).resolves.toBe("updated");
  });

  it("checks headless transaction payment and purchase amounts", async () => {
    const payment = harness(baseAttempt({ kind: "headless", quote_amount_kind: "payment", quote_request_amount: "10" }));
    vi.mocked(payment.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(payment.worker.runOne()).resolves.toBe("updated");
    const wrongAmount = harness(baseAttempt({ kind: "headless", quote_amount_kind: "purchase", quote_request_amount: "11" }));
    vi.mocked(wrongAmount.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(wrongAmount.worker.runOne()).resolves.toBe("attention");
  });

  it("checks settled amount and transaction hash against stored provider evidence", async () => {
    const wrongAmount = harness(baseAttempt({ settlement_status: "verified", expected_usdc_units: "11000000" }));
    vi.mocked(wrongAmount.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(wrongAmount.worker.runOne()).resolves.toBe("attention");
    const wrongHash = harness(baseAttempt({ settlement_status: "verified", provider_tx_hash: `0x${"b".repeat(64)}` }));
    vi.mocked(wrongHash.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(wrongHash.worker.runOne()).resolves.toBe("attention");
  });

  it("does not regress a completed status but still refreshes a repeated completion", async () => {
    const failedUpdate = harness(baseAttempt({ provider_status: "ONRAMP_ORDER_STATUS_COMPLETED", provider_updated_at: new Date() }));
    vi.mocked(failedUpdate.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction({ status: "ONRAMP_TRANSACTION_STATUS_FAILED" })] } as never);
    await expect(failedUpdate.worker.runOne()).resolves.toBe("updated");
    expect(failedUpdate.client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(false);
    const repeated = harness(baseAttempt({ provider_status: "ONRAMP_ORDER_STATUS_COMPLETED", provider_updated_at: new Date() }));
    vi.mocked(repeated.provider.transactions).mockResolvedValueOnce({ transactions: [baseTransaction()] } as never);
    await expect(repeated.worker.runOne()).resolves.toBe("updated");
    expect(repeated.client.query.mock.calls.some(([sql]) => String(sql).includes("provider_status=$2"))).toBe(true);
  });

  it("categorizes a provider uniqueness collision as an identity conflict", async () => {
    const conflict = Object.assign(new Error("unique violation"), { code: "23505" });
    const { worker, provider, client } = harness(baseAttempt());
    vi.mocked(provider.transactions).mockRejectedValueOnce(conflict);
    await expect(worker.runOne()).resolves.toBe("attention");
    expect(client.query.mock.calls.some(([sql]) => String(sql).includes("reconcile_error=$3"))).toBe(true);
  });

  it("suppresses a rollback error while preserving the original database failure", async () => {
    const failure = new Error("database failed");
    const { worker, client } = harness(undefined, { selectError: failure, rollbackError: new Error("rollback failed") });
    await expect(worker.runOne()).rejects.toBe(failure);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
