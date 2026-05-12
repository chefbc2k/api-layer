import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiServer } from "./app.js";

const originalEnv = { ...process.env };

async function startServer(options: Parameters<typeof createApiServer>[0] = {}) {
  const server = createApiServer(options).listen();
  await new Promise<void>((resolve) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once("listening", () => resolve());
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;
  return { server, port };
}

async function closeServer(server: Awaited<ReturnType<typeof startServer>>["server"]) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function apiCall(port: number, path: string, options: RequestInit = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    signal: AbortSignal.timeout(2_500),
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

    const { server, port } = await startServer({ port: 0 });

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        method: "POST",
        signal: AbortSignal.timeout(2_500),
      });
      expect(response.status).toBe(404);
    } finally {
      await closeServer(server);
    }
  });

  it("rejects invalid path params before touching a provider", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });

    const { server, port } = await startServer({ port: 0 });

    try {
      const { status, payload } = await apiCall(port, "/v1/voice-assets/not-a-bytes32");
      expect(status).toBe(400);
      expect(payload).toMatchObject({ error: expect.stringContaining("invalid param 0") });
    } finally {
      await closeServer(server);
    }
  });

  it("rejects unsupported gasless modes on explicit endpoints", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });

    const { server, port } = await startServer({ port: 0 });

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
      await closeServer(server);
    }
  });

  it("suppresses the startup log when quiet mode is enabled", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { server } = await startServer({ port: 0, quiet: true });

    try {
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      await closeServer(server);
      logSpy.mockRestore();
    }
  });

  it("uses the env port fallback when no explicit options are provided", async () => {
    process.env.API_LAYER_KEYS_JSON = JSON.stringify({
      "test-key": { label: "test", roles: ["service"], allowGasless: true },
    });
    process.env.API_LAYER_PORT = "0";
    process.env.CHAIN_ID = "31337";

    const { server, port } = await startServer();

    try {
      const { status, payload } = await apiCall(port, "/v1/system/health", {
        headers: {},
      });
      expect(status).toBe(200);
      expect(payload).toEqual({
        ok: true,
        chainId: 31337,
      });
    } finally {
      await closeServer(server);
    }
  });
});
