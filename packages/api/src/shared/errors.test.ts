import { ZodError, z } from "zod";
import { describe, expect, it } from "vitest";

import { HttpError, toHttpError } from "./errors.js";

describe("toHttpError", () => {
  it("returns existing HttpError instances unchanged", () => {
    const error = new HttpError(418, "teapot", { id: "req-1" });

    expect(toHttpError(error)).toBe(error);
  });

  it("maps zod failures to 400 responses", () => {
    const result = z.object({ amount: z.string().min(3) }).safeParse({ amount: "1" });
    expect(result.success).toBe(false);

    const httpError = toHttpError((result as { error: ZodError }).error);

    expect(httpError.statusCode).toBe(400);
    expect(httpError.message).toContain("expected string");
  });

  it("maps authentication and authorization failures", () => {
    expect(toHttpError(new Error("missing x-api-key"))).toMatchObject({ statusCode: 401 });
    expect(toHttpError(new Error("invalid x-api-key"))).toMatchObject({ statusCode: 401 });
    expect(toHttpError(new Error("API key not permitted for live writes"))).toMatchObject({ statusCode: 403 });
  });

  it("maps rate limit and request validation failures while preserving diagnostics", () => {
    const rateLimited = Object.assign(new Error("rate limit exceeded for founder-key"), {
      diagnostics: { retryAfterSeconds: 60 },
    });
    const invalidRequest = Object.assign(new Error("expected uint256 amount"), {
      diagnostics: { field: "amount" },
    });
    const liveOnly = new Error("workflow requires live chain execution");
    const combined = new Error("gasless mode cannot be combined with indexed execution");

    expect(toHttpError(rateLimited)).toMatchObject({
      statusCode: 429,
      diagnostics: { retryAfterSeconds: 60 },
    });
    expect(toHttpError(invalidRequest)).toMatchObject({
      statusCode: 400,
      diagnostics: { field: "amount" },
    });
    expect(toHttpError(liveOnly)).toMatchObject({ statusCode: 400 });
    expect(toHttpError(combined)).toMatchObject({ statusCode: 400 });
  });

  it("falls back to a 500 for unknown failures", () => {
    const failure = Object.assign(new Error("database unavailable"), {
      diagnostics: { provider: "alchemy" },
    });

    expect(toHttpError(failure)).toMatchObject({
      statusCode: 500,
      message: "database unavailable",
      diagnostics: { provider: "alchemy" },
    });
    expect(toHttpError("plain failure")).toMatchObject({
      statusCode: 500,
      message: "plain failure",
    });
  });
});
