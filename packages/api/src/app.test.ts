import { afterEach, describe, expect, it } from "vitest";

import { createApiServer } from "./app.js";

const originalEnv = { ...process.env };

async function apiCall(port: number, path: string, options: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-api-key": "test-key",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

describe("createApiServer", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not expose the legacy POST / endpoint", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });
    process.env.CBDP_RPC_URL = "http://127.0.0.1:8545";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:8546";
    process.env.API_LAYER_DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";

    const server = createApiServer({ port: 0 }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "test-key",
        },
        body: JSON.stringify({ hello: "world" }),
      });
      expect(response.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("rejects invalid path params before touching a provider", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });
    process.env.CBDP_RPC_URL = "http://127.0.0.1:8545";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:8546";
    process.env.API_LAYER_DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";

    const server = createApiServer({ port: 0 }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/voice-assets/not-a-bytes32");
      expect(status).toBe(400);
      expect(payload).toMatchObject({ error: expect.stringContaining("invalid param 0") });
    } finally {
      server.close();
    }
  });

  it("rejects unsupported gasless modes on explicit endpoints", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });
    process.env.CBDP_RPC_URL = "http://127.0.0.1:8545";
    process.env.ALCHEMY_RPC_URL = "http://127.0.0.1:8546";
    process.env.API_LAYER_DIAMOND_ADDRESS = "0x0000000000000000000000000000000000000001";

    const server = createApiServer({ port: 0 }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/tokenomics/commands/approve", {
        method: "POST",
        headers: {
          "x-gasless-mode": "cdpSmartWallet",
        },
        body: JSON.stringify({
          spender: "0x0000000000000000000000000000000000000001",
          amount: "5",
        }),
      });
      expect(status).toBe(400);
      expect(payload).toMatchObject({ error: expect.stringContaining("does not allow gaslessMode") });
    } finally {
      server.close();
    }
  });
});
