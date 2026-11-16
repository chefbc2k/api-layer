import { createServer } from "node:http";
import { Server } from "node:net";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("exports the API without opening a port and retains health and private-request authentication", async () => {
  vi.stubEnv("RPC_URL", "http://127.0.0.1:8545");
  vi.stubEnv("ALCHEMY_RPC_URL", "http://127.0.0.1:8545");
  vi.stubEnv("DIAMOND_ADDRESS", "0x0000000000000000000000000000000000000001");
  vi.stubEnv("CHAIN_ID", "84532");
  vi.stubEnv("API_LAYER_KEYS_JSON", "{}");
  vi.stubEnv("API_LAYER_FUNDING_ENABLED", "false");
  vi.stubEnv("API_LAYER_FUNDING_WEBHOOK_ENABLED", "false");
  const listen = vi.spyOn(Server.prototype, "listen");
  const { default: app } = await import("../app.js");
  expect(listen).not.toHaveBeenCalled();
  listen.mockRestore();

  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local test listener");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${origin}/v1/system/health`, { signal: AbortSignal.timeout(2500) });
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, chainId: 84532 });
    const privateRequest = await fetch(`${origin}/v1/transactions/requests/00000000-0000-4000-8000-000000000000`, {
      signal: AbortSignal.timeout(2500),
    });
    expect(privateRequest.status).toBe(401);
    expect(await privateRequest.json()).toEqual({ error: "missing x-api-key" });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
