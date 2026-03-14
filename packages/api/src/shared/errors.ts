import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly diagnostics?: unknown,
  ) {
    super(message);
  }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new HttpError(400, error.issues.map((issue) => issue.message).join("; "));
  }
  const message = String((error as { message?: string })?.message ?? error);
  const lower = message.toLowerCase();
  const diagnostics = (error as { diagnostics?: unknown })?.diagnostics;
  if (lower.includes("missing x-api-key") || lower.includes("invalid x-api-key")) {
    return new HttpError(401, message, diagnostics);
  }
  if (message.includes("API key not permitted")) {
    return new HttpError(403, message, diagnostics);
  }
  if (lower.includes("rate limit exceeded")) {
    return new HttpError(429, message, diagnostics);
  }
  if (
    lower.includes("unsupported") ||
    lower.includes("invalid") ||
    lower.includes("expected") ||
    lower.includes("does not allow") ||
    lower.includes("requires live chain execution") ||
    lower.includes("indexed execution is not implemented") ||
    lower.includes("cannot be combined")
  ) {
    return new HttpError(400, message, diagnostics);
  }
  return new HttpError(500, message, diagnostics);
}
