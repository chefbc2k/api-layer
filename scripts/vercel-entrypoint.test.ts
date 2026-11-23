import { once } from "node:events";
import { createServer } from "node:http";
import { Server } from "node:net";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

let app: typeof import("../app.js").default;

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeAll(async () => {
  vi.stubEnv("RPC_URL", "http://127.0.0.1:8545");
  vi.stubEnv("ALCHEMY_RPC_URL", "http://127.0.0.1:8545");
  vi.stubEnv("DIAMOND_ADDRESS", "0x0000000000000000000000000000000000000001");
  vi.stubEnv("CHAIN_ID", "84532");
  vi.stubEnv("API_LAYER_KEYS_JSON", "{}");
  vi.stubEnv("API_LAYER_FUNDING_ENABLED", "false");
  vi.stubEnv("API_LAYER_FUNDING_WEBHOOK_ENABLED", "false");
  const listen = vi.spyOn(Server.prototype, "listen");
  try {
    ({ default: app } = await import("../app.js"));
    expect(listen).not.toHaveBeenCalled();
  } finally {
    listen.mockRestore();
  }
}, 20_000); // The cold import also loads the coverage-instrumented API.

it("exports the API without opening a port and retains health and private-request authentication", async () => {
  const server = createServer(app);
  const ready = once(server, "listening");
  server.listen(0, "127.0.0.1");
  try {
    await ready;
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing local test listener");
    const origin = `http://127.0.0.1:${address.port}`;
    const signal = AbortSignal.timeout(2500);
    const [health, privateRequest] = await Promise.all([
      fetch(`${origin}/v1/system/health`, { signal }),
      fetch(`${origin}/v1/transactions/requests/00000000-0000-4000-8000-000000000000`, { signal }),
    ]);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, chainId: 84532 });
    expect(privateRequest.status).toBe(401);
    expect(await privateRequest.json()).toEqual({ error: "missing x-api-key" });
  } finally {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
});
