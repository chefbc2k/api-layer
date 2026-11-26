import express from "express";
import { getAddress, Interface, type Provider } from "ethers";
import type { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiExecutionContext } from "../shared/execution-context.js";
import { loadApiKeys } from "../shared/auth.js";
import { RateLimiter } from "../shared/rate-limit.js";

const readiness = vi.hoisted(() => ({ inspectReadiness: vi.fn() }));
vi.mock("./readiness.js", () => readiness);

import { createPurchaseRouter, verifyPurchase, type PurchaseIntent } from "./purchase.js";
import { BASE_SEPOLIA_USDC } from "./config.js";

const wallet = getAddress("0x00000000000000000000000000000000000000aa");
const seller = getAddress("0x00000000000000000000000000000000000000bb");
const diamond = getAddress("0x00000000000000000000000000000000000000dd");
const tokenId = "1";
const price = 10_000_001n;
const blockHash = `0x${"ab".repeat(32)}`;
const finalHash = `0x${"ef".repeat(32)}`;
const txHash = `0x${"cd".repeat(32)}`;
const purchaseAbi = new Interface([
  "function getListing(uint256) view returns(tuple(uint256 tokenId,address seller,uint256 price,uint256 createdAt,uint256 createdBlock,uint256 lastUpdateBlock,uint256 expiresAt,bool isActive))",
  "function ownerOf(uint256) view returns(address)",
  "function getOriginalOwner(uint256) view returns(address)",
  "function isInEscrow(uint256) view returns(bool)",
  "function isPaused() view returns(bool)",
  "function paymentPaused() view returns(bool)",
  "function purchaseAsset(uint256)",
  "event AssetPurchased(uint256 indexed tokenId,address indexed seller,address indexed buyer,uint256 price)",
]);
const erc20Abi = new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const requestBody = {
  fundingAttemptId: "00000000-0000-4000-8000-000000000001",
  tokenId,
  expectedPriceUsdcUnits: price.toString(),
  expectedSeller: seller,
  authorizePurchase: true,
};

function rpcFixture() {
  const listing = [1n, seller, price, 0n, 0n, 0n, 0n, true];
  let currentOwner = diamond;
  const rpc = {
    call: vi.fn(async (transaction: { data: string }) => {
      const decoded = purchaseAbi.parseTransaction({ data: transaction.data });
      if (!decoded) throw new Error("unexpected call");
      const values: Record<string, unknown[]> = {
        getListing: [listing],
        ownerOf: [currentOwner],
        getOriginalOwner: [seller],
        isInEscrow: [true],
        isPaused: [false],
        paymentPaused: [false],
      };
      return purchaseAbi.encodeFunctionResult(decoded.name, values[decoded.name] ?? []);
    }),
    getBlock: vi.fn(async (tag: number | "finalized") => tag === "finalized" || tag === 101
      ? { number: 101, hash: finalHash }
      : { number: 100, hash: blockHash }),
    getNetwork: vi.fn(async () => ({ chainId: 84532n })),
    getTransaction: vi.fn(async () => ({
      hash: txHash,
      chainId: 84532n,
      from: wallet,
      to: diamond,
      data: purchaseAbi.encodeFunctionData("purchaseAsset", [tokenId]),
      value: 0n,
    })),
    getTransactionReceipt: vi.fn(async () => {
      const purchased = purchaseAbi.encodeEventLog(purchaseAbi.getEvent("AssetPurchased")!, [tokenId, seller, wallet, price]);
      const debit = erc20Abi.encodeEventLog(erc20Abi.getEvent("Transfer")!, [wallet, seller, price]);
      const unrelatedTransfer = erc20Abi.encodeEventLog(erc20Abi.getEvent("Transfer")!, [seller, wallet, 99n]);
      return {
        hash: txHash,
        status: 1,
        blockNumber: 100,
        blockHash,
        logs: [
          { address: diamond, ...purchased, removed: false },
          { address: BASE_SEPOLIA_USDC, ...debit, removed: false },
          { address: BASE_SEPOLIA_USDC, ...unrelatedTransfer, removed: false },
        ],
      };
    }),
  };
  return { ...rpc, setOwner(value: string) { currentOwner = value; } };
}

function databaseHarness() {
  const intent = {
    chainId: 84532,
    walletAddress: wallet,
    diamondAddress: diamond,
    tokenAddress: BASE_SEPOLIA_USDC,
    tokenId,
    seller,
    priceUsdcUnits: price.toString(),
    observedBlock: 100,
    observedBlockHash: blockHash,
    requiresUserSignature: true,
    mustRevalidateBeforeSigning: true,
    transaction: { from: wallet, to: diamond, chainId: "0x14a34", data: purchaseAbi.encodeFunctionData("purchaseAsset", [tokenId]), value: "0x0", gas: "0x186a0" },
  };
  let receiptRow: Record<string, unknown> | null = null;
  let updateRowCount = 1;
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT id FROM funding_attempts")) return { rows: [{ id: requestBody.fundingAttemptId }], rowCount: 1 };
    if (sql.startsWith("INSERT INTO funding_purchase_requests")) {
      return { rows: [{ id: "00000000-0000-4000-8000-000000000002", expires_at: new Date("2026-11-25T20:00:00.000Z") }], rowCount: 1 };
    }
    if (sql.startsWith("SELECT * FROM funding_purchase_requests")) return { rows: receiptRow ? [receiptRow] : [], rowCount: receiptRow ? 1 : 0 };
    if (sql.startsWith("UPDATE funding_purchase_requests")) return { rows: updateRowCount ? [{ id: "00000000-0000-4000-8000-000000000002" }] : [], rowCount: updateRowCount };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return {
    pool: { query } as unknown as Pool,
    query,
    intent,
    setReceiptRow(value: Record<string, unknown> | null) { receiptRow = value; },
    setUpdateRowCount(value: number) { updateRowCount = value; },
  };
}

describe("funding purchase HTTP routes", () => {
  const servers: Array<ReturnType<typeof express.Express["listen"]>> = [];
  afterEach(async () => {
    readiness.inspectReadiness.mockReset();
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  async function setup(sandbox = true) {
    const db = databaseHarness();
    const rpc = rpcFixture();
    readiness.inspectReadiness.mockResolvedValue({
      readiness: "ready_for_user_signature",
      requiredUsdcUnits: price.toString(),
      allowanceUsdcUnits: price.toString(),
      walletAddress: wallet,
      tokenAddress: BASE_SEPOLIA_USDC,
      blockNumber: 100,
      blockHash,
      gasUnits: "100000",
    });
    const context = {
      config: { chainId: 84532, diamondAddress: diamond },
      apiKeys: loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify({
        buyer: { label: "buyer", roles: ["buyer"], fundingUserId: "buyer_1", walletAddress: wallet },
        roleOnly: { label: "roleOnly", roles: ["buyer"], walletAddress: wallet },
        readOnlyBuyer: { label: "readOnlyBuyer", roles: [], fundingUserId: "buyer_1", walletAddress: wallet },
      }) }),
      rateLimiter: new RateLimiter(),
      providerRouter: { withProvider: vi.fn(async (_purpose: string, _label: string, callback: (provider: typeof rpc) => unknown) => callback(rpc)) },
    } as unknown as ApiExecutionContext;
    const app = express();
    app.use(express.json());
    app.use(createPurchaseRouter(context, db.pool, sandbox));
    const server = app.listen(0, "127.0.0.1");
    servers.push(server);
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("purchase test server did not bind");
    const base = `http://127.0.0.1:${address.port}/v1/funding/purchase-requests`;
    const call = async (url = base, body: unknown = requestBody, key = "buyer", walletHeader?: string) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, ...(walletHeader ? { "x-wallet-address": walletHeader } : {}) },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    return { db, rpc, call, base };
  }

  it("creates an unsigned purchase intent only after verified funding and exact readiness", async () => {
    const { call, db, rpc } = await setup();
    const response = await call();
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({
      requiresUserSignature: true,
      mustRevalidateBeforeSigning: true,
      transaction: { from: wallet, to: diamond, value: "0x0" },
    });
    expect(db.query.mock.calls.map(([sql]) => sql)).toEqual(expect.arrayContaining([
      expect.stringMatching(/^SELECT id FROM funding_attempts/),
      expect.stringMatching(/^INSERT INTO funding_purchase_requests/),
    ]));
    expect(rpc.call).toHaveBeenCalled();
  });

  it.each([
    ["unknown key", "unknown", undefined, 401],
    ["role without customer binding", "roleOnly", undefined, 403],
    ["substituted wallet", "buyer", "0x00000000000000000000000000000000000000cc", 403],
  ])("rejects %s before database or provider access", async (_name, key, suppliedWallet, status) => {
    const { call, db, rpc } = await setup();
    const response = await call(undefined, {}, String(key), suppliedWallet ? String(suppliedWallet) : undefined);
    expect(response.status).toBe(status);
    expect(db.query).not.toHaveBeenCalled();
    expect(rpc.call).not.toHaveBeenCalled();
  });

  it("rejects a customer-bound read-only key before database or provider access", async () => {
    const { call, db, rpc } = await setup();
    expect((await call(undefined, requestBody, "readOnlyBuyer")).status).toBe(403);
    expect(db.query).not.toHaveBeenCalled();
    expect(rpc.call).not.toHaveBeenCalled();
  });

  it("rejects invalid consent and customer funding without calling the provider", async () => {
    const { call, db, rpc } = await setup();
    expect((await call(undefined, { ...requestBody, authorizePurchase: false })).status).toBe(400);
    db.query.mockImplementationOnce(async () => ({ rows: [], rowCount: 0 }));
    expect((await call()).status).toBe(409);
    expect(rpc.call).not.toHaveBeenCalled();
  });

  it("rejects stale readiness and a changed canonical purchase snapshot", async () => {
    const blocked = await setup();
    readiness.inspectReadiness.mockResolvedValueOnce({ readiness: "insufficient_allowance" });
    expect((await blocked.call()).status).toBe(409);
    const changed = await setup();
    changed.rpc.getBlock.mockResolvedValueOnce({ number: 100, hash: finalHash });
    expect((await changed.call()).status).toBe(503);
  });

  it("maps duplicate receipt and unexpected persistence failures without exposing details", async () => {
    const duplicate = await setup();
    duplicate.db.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT id FROM funding_attempts")) return { rows: [{ id: requestBody.fundingAttemptId }], rowCount: 1 };
      if (sql.startsWith("INSERT INTO funding_purchase_requests")) throw Object.assign(new Error("private database detail"), { code: "23505" });
      throw new Error(`unexpected SQL: ${sql}`);
    });
    const duplicateResponse = await duplicate.call();
    expect(duplicateResponse, JSON.stringify(duplicate.db.query.mock.calls)).toMatchObject({ status: 409, body: { error: "Invalid funding purchase request" } });
    const unavailable = await setup();
    unavailable.db.query.mockRejectedValueOnce(new Error("private database detail"));
    expect((await unavailable.call()).body).toEqual({ error: "Funding purchase unavailable" });
  });

  it("confirms an owner-scoped finalized receipt and persists its proof", async () => {
    const { call, db, base, rpc } = await setup();
    const savedIntent = { ...db.intent, walletAddress: wallet };
    db.setReceiptRow({
      id: "00000000-0000-4000-8000-000000000002",
      user_id: "buyer_1",
      wallet_address: wallet,
      sandbox: true,
      tx_hash: null,
      intent: savedIntent,
      expires_at: new Date("2026-11-25T20:00:00.000Z"),
    });
    rpc.setOwner(wallet);
    const response = await call(`${base}/00000000-0000-4000-8000-000000000002/receipt`, { txHash });
    expect(response.status, JSON.stringify(response.body)).toBe(200);
    expect(response.body).toMatchObject({ status: "test_confirmed", proof: { txHash, priceUsdcUnits: price.toString(), owner: wallet } });
    expect(db.query.mock.calls.at(-1)?.[0]).toMatch(/^UPDATE funding_purchase_requests/);
  });

  it("rejects receipt confirmation when the persistence compare-and-set loses a race", async () => {
    const { call, db, base, rpc } = await setup();
    db.setReceiptRow({
      id: "00000000-0000-4000-8000-000000000002",
      user_id: "buyer_1",
      wallet_address: wallet,
      sandbox: true,
      tx_hash: null,
      intent: { ...db.intent, walletAddress: wallet },
      expires_at: new Date("2026-11-25T20:00:00.000Z"),
    });
    db.setUpdateRowCount(0);
    rpc.setOwner(wallet);

    const response = await call(`${base}/00000000-0000-4000-8000-000000000002/receipt`, { txHash });
    expect(response).toMatchObject({ status: 409, body: { error: "Purchase receipt conflict" } });
    expect(db.query.mock.calls.at(-1)?.[0]).toMatch(/^UPDATE funding_purchase_requests/);
  });

  it("allows retrying the same receipt and reports an expired but final production request", async () => {
    const { call, db, base, rpc } = await setup(false);
    db.setReceiptRow({
      id: "00000000-0000-4000-8000-000000000002",
      tx_hash: txHash,
      intent: db.intent,
      expires_at: new Date("2000-01-01T00:00:00.000Z"),
    });
    rpc.setOwner(wallet);
    const response = await call(`${base}/00000000-0000-4000-8000-000000000002/receipt`, { txHash });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "confirmed", late: true });
  });

  it("creates a production purchase intent only for an exactly verified settlement", async () => {
    const { call, db } = await setup(false);
    const response = await call();
    expect(response.status).toBe(200);
    expect(db.query.mock.calls[0]?.[1]?.[5]).toBe("verified");
    expect(response.body).toMatchObject({ requiresUserSignature: true, transaction: { chainId: "0x14a34" } });
  });

  it("rejects invalid chain, hash, pending transaction, and pending receipt", async () => {
    const { rpc, db } = await setup();
    const intent = db.intent as unknown as PurchaseIntent;
    const provider = rpc as unknown as Provider;
    await expect(verifyPurchase(provider, intent, "invalid")).rejects.toThrow("chain or hash mismatch");
    rpc.getNetwork.mockResolvedValueOnce({ chainId: 8453n });
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("chain or hash mismatch");
    rpc.getTransaction.mockResolvedValueOnce(null as never);
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("receipt pending");
    rpc.getTransactionReceipt.mockResolvedValueOnce(null as never);
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("receipt pending");
  });

  it("rejects incomplete finality and an event that differs from customer consent", async () => {
    const { rpc, db } = await setup();
    const intent = db.intent as unknown as PurchaseIntent;
    const provider = rpc as unknown as Provider;
    rpc.getBlock.mockResolvedValueOnce(null as never);
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("finality pending");
    rpc.getTransactionReceipt.mockImplementationOnce(async () => {
      const wrongPurchase = purchaseAbi.encodeEventLog(purchaseAbi.getEvent("AssetPurchased")!, [tokenId, seller, wallet, price + 1n]);
      const debit = erc20Abi.encodeEventLog(erc20Abi.getEvent("Transfer")!, [wallet, seller, price]);
      return { hash: txHash, status: 1, blockNumber: 100, blockHash, logs: [
        { address: diamond, ...wrongPurchase, removed: false },
        { address: BASE_SEPOLIA_USDC, ...debit, removed: false },
      ] };
    });
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("event differs");
  });

  it("rejects removed payment transfers, incorrect spend, and reorged finality", async () => {
    const { rpc, db } = await setup();
    const intent = db.intent as unknown as PurchaseIntent;
    const provider = rpc as unknown as Provider;
    rpc.setOwner(wallet);
    const baseReceipt = await rpc.getTransactionReceipt(txHash);
    const removed = structuredClone(baseReceipt);
    removed.logs[1].removed = true;
    rpc.getTransactionReceipt.mockResolvedValueOnce(removed);
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("Purchase reorg pending");
    const wrongDebit = structuredClone(baseReceipt);
    wrongDebit.logs[1].data = `0x${(price - 1n).toString(16).padStart(64, "0")}`;
    rpc.getTransactionReceipt.mockResolvedValueOnce(wrongDebit);
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("payment or ownership");
    rpc.getBlock.mockResolvedValueOnce({ number: 101, hash: finalHash })
      .mockResolvedValueOnce({ number: 100, hash: blockHash })
      .mockResolvedValueOnce({ number: 100, hash: `0x${"11".repeat(32)}` })
      .mockResolvedValueOnce({ number: 101, hash: finalHash });
    await expect(verifyPurchase(provider, intent, txHash)).rejects.toThrow("Purchase reorg pending");
  });

  it("rejects malformed receipt ids and hashes before provider access", async () => {
    const { call, base, rpc, db } = await setup();
    expect((await call(`${base}/not-a-uuid/receipt`, { txHash })).status).toBe(400);
    expect((await call(`${base}/00000000-0000-4000-8000-000000000002/receipt`, { txHash: "bad" })).status).toBe(400);
    expect(rpc.getTransaction).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("keeps receipt failures owner-scoped and rejects rebinding or update conflicts", async () => {
    const { call, db, base } = await setup();
    const url = `${base}/00000000-0000-4000-8000-000000000002/receipt`;
    expect((await call(url, { txHash })).status).toBe(404);
    db.setReceiptRow({ id: "request", tx_hash: `0x${"11".repeat(32)}`, expires_at: new Date(), intent: db.intent });
    expect((await call(url, { txHash })).status).toBe(409);
    db.setReceiptRow({ id: "request", tx_hash: null, expires_at: new Date(), intent: db.intent });
    db.setUpdateRowCount(0);
    expect((await call(url, { txHash })).status).toBe(409);
  });
});
