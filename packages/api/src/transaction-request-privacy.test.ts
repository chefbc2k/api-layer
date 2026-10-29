import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiServer } from "./app.js";
import { loadApiKeys } from "./shared/auth.js";
import type { ApiExecutionContext } from "./shared/execution-context.js";
import { transactionRequestOwnerHash } from "./shared/request-owner.js";

const id = "123e4567-e89b-42d3-a456-426614174000";
const wallet = "0x00000000000000000000000000000000000000aa";
const env = { ...process.env };
const servers: Array<ReturnType<ReturnType<typeof createApiServer>["listen"]>> = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>(resolve => server.close(() => resolve()));
  process.env = { ...env };
});
async function setup() {
  process.env.API_LAYER_FUNDING_ENABLED = "false";
  process.env.API_LAYER_FUNDING_WEBHOOK_ENABLED = "false";
  process.env.RPC_URL = "http://127.0.0.1:8545";
  process.env.DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";
  const api = createApiServer({ port: 0, quiet: true });
  const context = api.app.get("apiExecutionContext") as ApiExecutionContext;
  context.apiKeys = loadApiKeys({ API_LAYER_KEYS_JSON: JSON.stringify({
    owner: { label: "shared label", signerId: "logical-signer", walletAddress: wallet, requestOwnerId: "customer_a" },
    rotated: { label: "new label", signerId: "logical-signer", walletAddress: wallet, requestOwnerId: "customer_a" },
    stranger: { label: "shared label", signerId: "logical-signer", walletAddress: wallet, requestOwnerId: "customer_b" },
    admin: { label: "admin", roles: ["admin"], signerId: "logical-signer", walletAddress: wallet },
    changedSigner: { label: "shared label", signerId: "different-signer", walletAddress: wallet, requestOwnerId: "customer_a" },
    fallback: { label: "shared label", signerId: "logical-signer", walletAddress: wallet },
    fallbackOther: { label: "shared label", signerId: "logical-signer", walletAddress: wallet },
  }) });
  const hash = transactionRequestOwnerHash(context.apiKeys.owner);
  const getOwned = vi.spyOn(context.txStore, "getOwned").mockImplementation(async (_id, ownerHash) => ownerHash === hash && _id === id ? {
    id, owner_hash: hash, params: ["private request"], status: "submitted", response_payload: { private: true },
  } as never : null);
  const server = api.listen(); servers.push(server);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const port = (server.address() as import("node:net").AddressInfo).port;
  const call = async (key?: string, requestId = id, headers: Record<string, string> = {}) => {
    const response = await fetch(`http://127.0.0.1:${port}/v1/transactions/requests/${requestId}`, { headers: { ...(key ? { "x-api-key": key } : {}), ...headers } });
    return { status: response.status, payload: await response.json(), headers: response.headers };
  };
  return { context, getOwned, call, port };
}

describe("private transaction-request HTTP authorization", () => {
  it("authenticates before ID validation or any storage access", async () => {
    const { call, getOwned } = await setup();
    expect((await call(undefined, "malformed")).status).toBe(401);
    expect((await call("invalid", "malformed")).status).toBe(401);
    expect(getOwned).not.toHaveBeenCalled();
  });
  it("returns only the owner's private payload without owner hashes and disables caching", async () => {
    const { call, getOwned, context } = await setup();
    const result = await call("owner");
    expect(result.status).toBe(200); expect(result.payload).toMatchObject({ id, params: ["private request"] });
    expect(result.payload).not.toHaveProperty("owner_hash");
    expect(result.headers.get("cache-control")).toBe("no-store");
    expect(getOwned).toHaveBeenCalledWith(id, transactionRequestOwnerHash(context.apiKeys.owner));
  });
  it.each(["stranger", "admin", "changedSigner", "fallback"])("denies %s regardless of shared label/wallet, role or forged wallet header", async key => {
    const { call } = await setup();
    const result = await call(key, id, { "x-wallet-address": wallet, "x-request-owner-id": "customer_a" });
    expect(result.status).toBe(404); expect(result.payload).toEqual({ error: "Transaction request not found" });
  });
  it("permits explicitly provisioned key rotation but denies revoked keys on the next lookup", async () => {
    const { call, context, getOwned } = await setup();
    expect((await call("rotated")).status).toBe(200);
    delete context.apiKeys.owner;
    getOwned.mockClear(); expect((await call("owner")).status).toBe(401); expect(getOwned).not.toHaveBeenCalled();
  });
  it("isolates keys lacking stable owner IDs even when all non-secret metadata matches", async () => {
    const { context } = await setup();
    expect(transactionRequestOwnerHash(context.apiKeys.fallback)).not.toBe(transactionRequestOwnerHash(context.apiKeys.fallbackOther));
    const renamed = { ...context.apiKeys.fallback, label: "renamed", walletAddress: "different" };
    expect(transactionRequestOwnerHash(renamed)).toBe(transactionRequestOwnerHash(context.apiKeys.fallback));
  });
  it("validates UUIDs before storage and returns the same response for missing, cross-owner and legacy ownerless rows", async () => {
    const { call, getOwned } = await setup();
    expect((await call("owner", "invalid")).status).toBe(400); expect(getOwned).not.toHaveBeenCalled();
    getOwned.mockResolvedValue(null);
    expect(await call("owner")).toMatchObject({ status: 404, payload: { error: "Transaction request not found" } });
  });
  it("redacts all storage failures including misleading error keywords", async () => {
    const { call, getOwned } = await setup();
    getOwned.mockRejectedValue(new Error("invalid password=private-database-secret"));
    expect(await call("owner")).toMatchObject({ status: 503, payload: { error: "Transaction request lookup unavailable" } });
  });
  it("rate limits private lookup before database access", async () => {
    const { call, context, getOwned } = await setup();
    vi.spyOn(context.rateLimiter, "enforce").mockRejectedValue(new Error("rate limit exceeded"));
    expect((await call("owner")).status).toBe(429); expect(getOwned).not.toHaveBeenCalled();
  });
  it("keeps public chain receipts accessible without private request authentication", async () => {
    const { context, port, getOwned } = await setup();
    context.alchemy = null;
    vi.spyOn(context.providerRouter, "withProvider").mockResolvedValue(null);
    const response = await fetch(`http://127.0.0.1:${port}/v1/transactions/0x${"a".repeat(64)}`);
    expect(response.status).toBe(200); expect(getOwned).not.toHaveBeenCalled();
  });
});
