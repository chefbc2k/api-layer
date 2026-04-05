import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
}));

const errorsMocks = vi.hoisted(() => ({
  toHttpError: vi.fn(),
}));

const validationMocks = vi.hoisted(() => ({
  buildEventRequestSchema: vi.fn(),
  buildMethodRequestSchemas: vi.fn(),
  buildWireParams: vi.fn(),
}));

const executionContextMocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
}));

vi.mock("./auth.js", () => authMocks);
vi.mock("./errors.js", () => errorsMocks);
vi.mock("./validation.js", () => validationMocks);
vi.mock("./execution-context.js", () => executionContextMocks);

import {
  createEventRequestHandler,
  createEventSchema,
  createMethodRequestHandler,
  createMethodSchemas,
  registerRoute,
} from "./route-factory.js";

function createRequest(overrides: Partial<Record<string, unknown>> = {}) {
  const headers = new Map<string, string>();
  const appContext = {
    apiExecutionContext: {
      apiKeys: { "founder-key": { apiKey: "founder-key" } },
      rateLimiter: {},
    },
  };

  return {
    app: {
      get: vi.fn((key: string) => appContext[key as keyof typeof appContext]),
    },
    body: {},
    params: {},
    query: {},
    header: vi.fn((name: string) => headers.get(name.toLowerCase())),
    setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    ...overrides,
  };
}

function createResponse() {
  return {
    status: vi.fn(),
    json: vi.fn(),
  };
}

describe("route-factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates method handlers that authenticate, rate-limit, invoke, and serialize the response", async () => {
    const auth = { apiKey: "founder-key", label: "founder" };
    authMocks.authenticate.mockReturnValue(auth);
    executionContextMocks.enforceRateLimit.mockResolvedValue(undefined);
    validationMocks.buildWireParams.mockReturnValue({ amount: "10" });

    const request = createRequest();
    request.setHeader("x-api-key", "founder-key");
    request.setHeader("x-wallet-address", "0xabc");
    request.setHeader("x-gasless-mode", "signature");
    request.setHeader("x-execution-source", "wallet");

    const response = createResponse();
    response.status.mockReturnValue(response);

    const schemas = {
      path: { parse: vi.fn(() => ({ proposalId: "42" })) },
      query: { parse: vi.fn(() => ({ dryRun: "false" })) },
      body: { parse: vi.fn(() => ({ amount: "10" })) },
    };
    const invoke = vi.fn().mockResolvedValue({ statusCode: 202, body: { ok: true } });

    const handler = createMethodRequestHandler(
      { rateLimitKind: "write" } as never,
      schemas as never,
      invoke,
    );

    await handler(request as never, response as never, vi.fn());

    expect(executionContextMocks.enforceRateLimit).toHaveBeenCalledWith(
      request.app.get("apiExecutionContext"),
      { rateLimitKind: "write" },
      auth,
      { gaslessMode: "signature", executionSource: "wallet" },
      "0xabc",
    );
    expect(validationMocks.buildWireParams).toHaveBeenCalledWith(
      { rateLimitKind: "write" },
      {
        path: { proposalId: "42" },
        query: { dryRun: "false" },
        body: { amount: "10" },
      },
    );
    expect(invoke).toHaveBeenCalledWith({
      auth,
      api: { gaslessMode: "signature", executionSource: "wallet" },
      walletAddress: "0xabc",
      wireParams: { amount: "10" },
    });
    expect(response.status).toHaveBeenCalledWith(202);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });

  it("serializes method handler errors with diagnostics", async () => {
    const request = createRequest();
    const response = createResponse();
    response.status.mockReturnValue(response);
    const error = new Error("boom");
    errorsMocks.toHttpError.mockReturnValue({
      statusCode: 418,
      message: "teapot",
      diagnostics: { requestId: "req-1" },
    });

    const handler = createMethodRequestHandler(
      { rateLimitKind: "read" } as never,
      {
        path: { parse: vi.fn(() => ({})) },
        query: { parse: vi.fn(() => ({})) },
        body: { parse: vi.fn(() => ({})) },
      } as never,
      vi.fn().mockRejectedValue(error),
    );

    await handler(request as never, response as never, vi.fn());

    expect(errorsMocks.toHttpError).toHaveBeenCalledWith(error);
    expect(response.status).toHaveBeenCalledWith(418);
    expect(response.json).toHaveBeenCalledWith({
      error: "teapot",
      diagnostics: { requestId: "req-1" },
    });
  });

  it("creates event handlers that normalize block ranges before invoking", async () => {
    const auth = { apiKey: "reader-key", label: "reader" };
    authMocks.authenticate.mockReturnValue(auth);
    executionContextMocks.enforceRateLimit.mockResolvedValue(undefined);

    const request = createRequest({
      body: { fromBlock: "10", toBlock: "latest" },
    });
    request.setHeader("x-api-key", "reader-key");
    const response = createResponse();
    response.status.mockReturnValue(response);
    const invoke = vi.fn().mockResolvedValue({ statusCode: 200, body: [{ ok: true }] });

    const handler = createEventRequestHandler(
      { httpMethod: "POST", path: "/events" } as never,
      { body: { parse: vi.fn(() => ({ fromBlock: "10", toBlock: "latest" })) } } as never,
      invoke,
    );

    await handler(request as never, response as never, vi.fn());

    expect(executionContextMocks.enforceRateLimit).toHaveBeenCalledWith(
      request.app.get("apiExecutionContext"),
      { rateLimitKind: "read" },
      auth,
      { gaslessMode: "none", executionSource: "auto" },
      undefined,
    );
    expect(invoke).toHaveBeenCalledWith({
      auth,
      fromBlock: 10n,
      toBlock: "latest",
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([{ ok: true }]);
  });

  it("serializes event handler errors without diagnostics when absent", async () => {
    const request = createRequest();
    const response = createResponse();
    response.status.mockReturnValue(response);
    errorsMocks.toHttpError.mockReturnValue({
      statusCode: 500,
      message: "broken",
      diagnostics: undefined,
    });

    const handler = createEventRequestHandler(
      { httpMethod: "POST", path: "/events" } as never,
      { body: { parse: vi.fn(() => ({})) } } as never,
      vi.fn().mockRejectedValue(new Error("broken")),
    );

    await handler(request as never, response as never, vi.fn());

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "broken" });
  });

  it("registers every supported http method", () => {
    const router = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    const handler = vi.fn();

    registerRoute(router as never, { httpMethod: "GET", path: "/get" }, handler);
    registerRoute(router as never, { httpMethod: "POST", path: "/post" }, handler);
    registerRoute(router as never, { httpMethod: "PATCH", path: "/patch" }, handler);
    registerRoute(router as never, { httpMethod: "DELETE", path: "/delete" }, handler);

    expect(router.get).toHaveBeenCalledWith("/get", handler);
    expect(router.post).toHaveBeenCalledWith("/post", handler);
    expect(router.patch).toHaveBeenCalledWith("/patch", handler);
    expect(router.delete).toHaveBeenCalledWith("/delete", handler);
  });

  it("delegates schema builders to validation helpers", () => {
    const methodSchemas = { path: {}, query: {}, body: {} };
    const eventSchema = { body: {} };
    validationMocks.buildMethodRequestSchemas.mockReturnValue(methodSchemas);
    validationMocks.buildEventRequestSchema.mockReturnValue(eventSchema);

    expect(createMethodSchemas({ key: "test" } as never)).toBe(methodSchemas as never);
    expect(createEventSchema({ key: "event" } as never)).toBe(eventSchema as never);
  });
});
