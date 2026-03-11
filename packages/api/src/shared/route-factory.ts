import type { Request, RequestHandler, Router } from "express";

import { authenticate } from "./auth.js";
import { toHttpError } from "./errors.js";
import { buildWireParams, buildEventRequestSchema, buildMethodRequestSchemas } from "./validation.js";
import { enforceRateLimit, type ApiExecutionContext } from "./execution-context.js";
import type { ApiRequestOptions, EventRequestSchema, HttpEventDefinition, HttpMethodDefinition, RequestSchemas } from "./route-types.js";

function apiOptionsFromRequest(request: Request): ApiRequestOptions {
  return {
    gaslessMode: (request.header("x-gasless-mode") as ApiRequestOptions["gaslessMode"] | undefined) ?? "none",
    executionSource: (request.header("x-execution-source") as ApiRequestOptions["executionSource"] | undefined) ?? "auto",
  };
}

export function createMethodRequestHandler(
  definition: HttpMethodDefinition,
  schemas: RequestSchemas,
  invoke: (request: import("./route-types.js").PrimitiveInvocationRequest) => Promise<import("./route-types.js").RouteResult>,
): RequestHandler {
  return async (request, response) => {
    try {
      const auth = authenticate((request.app.get("apiExecutionContext") as ApiExecutionContext).apiKeys, request.header("x-api-key") ?? undefined);
      const apiExecutionContext = request.app.get("apiExecutionContext") as ApiExecutionContext;
      const api = apiOptionsFromRequest(request);
      const path = schemas.path.parse(request.params) as Record<string, unknown>;
      const query = schemas.query.parse(request.query) as Record<string, unknown>;
      const body = schemas.body.parse((request.body ?? {}) as Record<string, unknown>) as Record<string, unknown>;
      await enforceRateLimit(apiExecutionContext, definition, auth, api, request.header("x-wallet-address") ?? undefined);
      const wireParams = buildWireParams(definition, { path, query, body });
      const result = await invoke({
        auth,
        api,
        walletAddress: request.header("x-wallet-address") ?? undefined,
        wireParams,
      });
      response.status(result.statusCode).json(result.body);
    } catch (error) {
      const httpError = toHttpError(error);
      response.status(httpError.statusCode).json({ error: httpError.message });
    }
  };
}

export function createEventRequestHandler(
  _definition: HttpEventDefinition,
  schema: EventRequestSchema,
  invoke: (request: import("./route-types.js").EventInvocationRequest) => Promise<import("./route-types.js").RouteResult>,
): RequestHandler {
  return async (request, response) => {
    try {
      const apiExecutionContext = request.app.get("apiExecutionContext") as ApiExecutionContext;
      const auth = authenticate(apiExecutionContext.apiKeys, request.header("x-api-key") ?? undefined);
      const body = schema.body.parse((request.body ?? {}) as Record<string, unknown>) as { fromBlock?: string; toBlock?: string | "latest" };
      await enforceRateLimit(apiExecutionContext, { rateLimitKind: "read" }, auth, { gaslessMode: "none", executionSource: "auto" }, undefined);
      const result = await invoke({
        auth,
        fromBlock: body.fromBlock ? BigInt(body.fromBlock) : undefined,
        toBlock: body.toBlock === "latest" ? "latest" : body.toBlock ? BigInt(body.toBlock) : undefined,
      });
      response.status(result.statusCode).json(result.body);
    } catch (error) {
      const httpError = toHttpError(error);
      response.status(httpError.statusCode).json({ error: httpError.message });
    }
  };
}

export function registerRoute(router: Router, definition: Pick<HttpMethodDefinition, "httpMethod" | "path"> | Pick<HttpEventDefinition, "httpMethod" | "path">, handler: RequestHandler): void {
  switch (definition.httpMethod) {
    case "GET":
      router.get(definition.path, handler);
      return;
    case "POST":
      router.post(definition.path, handler);
      return;
    case "PATCH":
      router.patch(definition.path, handler);
      return;
    case "DELETE":
      router.delete(definition.path, handler);
      return;
  }
}

export function createMethodSchemas(definition: HttpMethodDefinition): RequestSchemas {
  return buildMethodRequestSchemas(definition);
}

export function createEventSchema(definition: HttpEventDefinition): EventRequestSchema {
  return buildEventRequestSchema(definition);
}
