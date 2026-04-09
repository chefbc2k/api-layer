import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "./shared/errors.js";

const mocks = vi.hoisted(() => {
  const providerStatus = {
    primary: "cbdp",
    secondary: "alchemy",
    active: "cbdp",
    failoverActive: false,
  };

  const createApiExecutionContext = vi.fn(() => ({
    providerRouter: {
      getStatus: vi.fn(() => providerStatus),
    },
  }));

  return {
    providerStatus,
    createApiExecutionContext,
    getTransactionRequest: vi.fn(),
    getTransactionStatus: vi.fn(),
    mountDomainModules: vi.fn(),
    createWorkflowRouter: vi.fn(() => (_request: unknown, _response: unknown, next: () => void) => next()),
  };
});

vi.mock("./modules/index.js", () => ({
  mountDomainModules: mocks.mountDomainModules,
}));

vi.mock("./shared/execution-context.js", () => ({
  createApiExecutionContext: mocks.createApiExecutionContext,
  getTransactionRequest: mocks.getTransactionRequest,
  getTransactionStatus: mocks.getTransactionStatus,
}));

vi.mock("./workflows/index.js", () => ({
  createWorkflowRouter: mocks.createWorkflowRouter,
}));

import { createApiServer } from "./app.js";

const originalEnv = { ...process.env };

async function startServer(options: Parameters<typeof createApiServer>[0] = {}) {
  const server = createApiServer(options).listen();
  await new Promise((resolve) => setTimeout(resolve, 25));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;
  return {
    server,
    port,
  };
}

async function jsonCall(port: number, path: string) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  return {
    status: response.status,
    payload: await response.json(),
  };
}

describe("createApiServer coverage branches", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns the configured system health chain id and provider status", async () => {
    process.env.API_LAYER_CHAIN_ID = "31337";
    process.env.CHAIN_ID = "84532";

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const health = await jsonCall(port, "/v1/system/health");
      const providerStatus = await jsonCall(port, "/v1/system/provider-status");

      expect(health).toEqual({
        status: 200,
        payload: { ok: true, chainId: 31337 },
      });
      expect(providerStatus).toEqual({
        status: 200,
        payload: mocks.providerStatus,
      });
      expect(mocks.mountDomainModules).toHaveBeenCalledOnce();
      expect(mocks.createWorkflowRouter).toHaveBeenCalledOnce();
    } finally {
      server.close();
    }
  });

  it("returns transaction request payloads on success", async () => {
    mocks.getTransactionRequest.mockResolvedValue({
      id: "req-123",
      status: "queued",
    });

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const result = await jsonCall(port, "/v1/transactions/requests/req-123");

      expect(result).toEqual({
        status: 200,
        payload: {
          id: "req-123",
          status: "queued",
        },
      });
      expect(mocks.getTransactionRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          providerRouter: expect.any(Object),
        }),
        "req-123",
      );
    } finally {
      server.close();
    }
  });

  it("omits diagnostics when a transaction request error does not include them", async () => {
    mocks.getTransactionRequest.mockRejectedValue(new Error("boom"));

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const result = await jsonCall(port, "/v1/transactions/requests/req-404");

      expect(result).toEqual({
        status: 500,
        payload: {
          error: "boom",
        },
      });
    } finally {
      server.close();
    }
  });

  it("includes diagnostics when transaction status lookup fails with them", async () => {
    mocks.getTransactionStatus.mockRejectedValue(
      new HttpError(429, "rate limit exceeded", { retryAfterMs: 500 }),
    );

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const result = await jsonCall(port, "/v1/transactions/0xabc");

      expect(result).toEqual({
        status: 429,
        payload: {
          error: "rate limit exceeded",
          diagnostics: { retryAfterMs: 500 },
        },
      });
    } finally {
      server.close();
    }
  });

  it("uses the environment port and logs startup when quiet mode is disabled", async () => {
    process.env.API_LAYER_PORT = "0";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const server = createApiServer().listen();

    try {
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(logSpy).toHaveBeenCalledWith("USpeaks API listening on 0");
    } finally {
      server.close();
      logSpy.mockRestore();
    }
  });

  it("prefers the explicit listen port and falls back to CHAIN_ID when API_LAYER_CHAIN_ID is unset", async () => {
    process.env.CHAIN_ID = "84531";

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const health = await jsonCall(port, "/v1/system/health");

      expect(health).toEqual({
        status: 200,
        payload: { ok: true, chainId: 84531 },
      });
    } finally {
      server.close();
    }
  });
});
