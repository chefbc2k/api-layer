import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "./shared/errors.js";

const mocks = vi.hoisted(() => {
  const apiExecutionContext = {
    providerRouter: {
      getStatus: vi.fn(),
    },
  };

  return {
    apiExecutionContext,
    createApiExecutionContext: vi.fn(() => apiExecutionContext),
    getTransactionRequest: vi.fn(),
    getTransactionStatus: vi.fn(),
    mountDomainModules: vi.fn(),
    createWorkflowRouter: vi.fn(() => {
      const router = ((
        _request: unknown,
        _response: unknown,
        next: (error?: unknown) => void,
      ) => next()) as Parameters<typeof mocks.createWorkflowRouter>[0];
      return router;
    }),
  };
});

vi.mock("./shared/execution-context.js", () => ({
  createApiExecutionContext: mocks.createApiExecutionContext,
  getTransactionRequest: mocks.getTransactionRequest,
  getTransactionStatus: mocks.getTransactionStatus,
}));

vi.mock("./modules/index.js", () => ({
  mountDomainModules: mocks.mountDomainModules,
}));

vi.mock("./workflows/index.js", () => ({
  createWorkflowRouter: mocks.createWorkflowRouter,
}));

import { createApiServer } from "./app.js";

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

async function apiCall(port: number, path: string) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    signal: AbortSignal.timeout(2_500),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

describe("createApiServer transaction and status routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiExecutionContext.providerRouter.getStatus.mockReturnValue({
      mode: "configured",
      chainId: 84532,
    });
  });

  afterEach(() => {
    delete process.env.API_LAYER_CHAIN_ID;
    delete process.env.CHAIN_ID;
  });

  it("serves provider status from the execution context", async () => {
    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const { status, payload } = await apiCall(port, "/v1/system/provider-status");
      expect(status).toBe(200);
      expect(payload).toEqual({
        mode: "configured",
        chainId: 84532,
      });
      expect(mocks.apiExecutionContext.providerRouter.getStatus).toHaveBeenCalledOnce();
    } finally {
      await closeServer(server);
    }
  });

  it("returns transaction request payloads and includes diagnostics on request lookup failures", async () => {
    mocks.getTransactionRequest
      .mockResolvedValueOnce({
        id: "req-1",
        status: "confirmed",
      })
      .mockRejectedValueOnce(new HttpError(409, "request blocked", { reason: "missing-proof" }));

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      await expect(apiCall(port, "/v1/transactions/requests/req-1")).resolves.toEqual({
        status: 200,
        payload: {
          id: "req-1",
          status: "confirmed",
        },
      });
      expect(mocks.getTransactionRequest).toHaveBeenNthCalledWith(1, mocks.apiExecutionContext, "req-1");

      await expect(apiCall(port, "/v1/transactions/requests/req-2")).resolves.toEqual({
        status: 409,
        payload: {
          error: "request blocked",
          diagnostics: { reason: "missing-proof" },
        },
      });
      expect(mocks.getTransactionRequest).toHaveBeenNthCalledWith(2, mocks.apiExecutionContext, "req-2");
    } finally {
      await closeServer(server);
    }
  });

  it("returns transaction status payloads and omits diagnostics for plain errors", async () => {
    mocks.getTransactionStatus
      .mockResolvedValueOnce({
        txHash: "0xabc",
        status: "confirmed",
      })
      .mockRejectedValueOnce(new Error("status lookup failed"));

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      await expect(apiCall(port, "/v1/transactions/0xabc")).resolves.toEqual({
        status: 200,
        payload: {
          txHash: "0xabc",
          status: "confirmed",
        },
      });
      expect(mocks.getTransactionStatus).toHaveBeenNthCalledWith(1, mocks.apiExecutionContext, "0xabc");

      await expect(apiCall(port, "/v1/transactions/0xdef")).resolves.toEqual({
        status: 500,
        payload: {
          error: "status lookup failed",
        },
      });
      expect(mocks.getTransactionStatus).toHaveBeenNthCalledWith(2, mocks.apiExecutionContext, "0xdef");
    } finally {
      await closeServer(server);
    }
  });

  it("prefers API_LAYER_CHAIN_ID over CHAIN_ID in the health response", async () => {
    process.env.API_LAYER_CHAIN_ID = "999";
    process.env.CHAIN_ID = "31337";

    const { server, port } = await startServer({ port: 0, quiet: true });

    try {
      const { status, payload } = await apiCall(port, "/v1/system/health");
      expect(status).toBe(200);
      expect(payload).toEqual({
        ok: true,
        chainId: 999,
      });
    } finally {
      await closeServer(server);
    }
  });

  it("falls back to the configured port in the startup log when server.address() is not structured", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const apiServer = createApiServer({ port: 4567 });

    const fakeServer = {
      address: vi.fn(() => "pipe"),
    };
    const listenSpy = vi
      .spyOn(apiServer.app, "listen")
      .mockImplementation(((port: number, callback?: () => void) => {
        expect(port).toBe(4567);
        queueMicrotask(() => callback?.());
        return fakeServer as never;
      }) as typeof apiServer.app.listen);

    try {
      expect(apiServer.listen()).toBe(fakeServer);
      await Promise.resolve();
      expect(logSpy).toHaveBeenCalledWith("USpeaks API listening on 4567");
    } finally {
      listenSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});
