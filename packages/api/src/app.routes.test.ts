import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const executionContextMocks = vi.hoisted(() => ({
  createApiExecutionContext: vi.fn(),
  getTransactionRequest: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

const moduleMocks = vi.hoisted(() => ({
  mountDomainModules: vi.fn(),
  createWorkflowRouter: vi.fn(),
}));

vi.mock("./shared/execution-context.js", () => executionContextMocks);
vi.mock("./modules/index.js", () => ({
  mountDomainModules: moduleMocks.mountDomainModules,
}));
vi.mock("./workflows/index.js", () => ({
  createWorkflowRouter: moduleMocks.createWorkflowRouter,
}));

import { createApiServer } from "./app.js";
import { HttpError } from "./shared/errors.js";

async function apiCall(port: number, path: string) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

describe("createApiServer route coverage", () => {
  beforeEach(() => {
    executionContextMocks.createApiExecutionContext.mockReturnValue({
      providerRouter: {
        getStatus: vi.fn(() => ({ activeProvider: "alchemy", failover: false })),
      },
    });
    executionContextMocks.getTransactionRequest.mockReset();
    executionContextMocks.getTransactionStatus.mockReset();
    moduleMocks.mountDomainModules.mockReset();
    moduleMocks.createWorkflowRouter.mockReset();
    moduleMocks.createWorkflowRouter.mockReturnValue((_request: unknown, _response: unknown, next: () => void) => next());
    delete process.env.API_LAYER_CHAIN_ID;
    delete process.env.CHAIN_ID;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the configured health chain id", async () => {
    process.env.API_LAYER_CHAIN_ID = "999";

    const server = createApiServer({ port: 0, quiet: true }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/system/health");
      expect(status).toBe(200);
      expect(payload).toEqual({ ok: true, chainId: 999 });
    } finally {
      server.close();
    }
  });

  it("returns provider router status from the execution context", async () => {
    const server = createApiServer({ port: 0, quiet: true }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/system/provider-status");
      expect(status).toBe(200);
      expect(payload).toEqual({ activeProvider: "alchemy", failover: false });
    } finally {
      server.close();
    }
  });

  it("maps transaction request errors through the HTTP serializer", async () => {
    executionContextMocks.getTransactionRequest.mockRejectedValue(
      new HttpError(404, "missing request", { requestId: "req-1" }),
    );

    const server = createApiServer({ port: 0, quiet: true }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/transactions/requests/req-1");
      expect(status).toBe(404);
      expect(payload).toEqual({
        error: "missing request",
        diagnostics: { requestId: "req-1" },
      });
    } finally {
      server.close();
    }
  });

  it("maps transaction status errors without diagnostics", async () => {
    executionContextMocks.getTransactionStatus.mockRejectedValue(
      new HttpError(502, "broken receipt"),
    );

    const server = createApiServer({ port: 0, quiet: true }).listen();
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 8787;

    try {
      const { status, payload } = await apiCall(port, "/v1/transactions/0xdead");
      expect(status).toBe(502);
      expect(payload).toEqual({ error: "broken receipt" });
    } finally {
      server.close();
    }
  });
});
