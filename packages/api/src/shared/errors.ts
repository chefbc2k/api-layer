export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  const message = String((error as { message?: string })?.message ?? error);
  if (message.includes("missing x-api-key") || message.includes("invalid x-api-key")) {
    return new HttpError(401, message);
  }
  if (message.includes("API key not permitted")) {
    return new HttpError(403, message);
  }
  if (message.includes("rate limit exceeded")) {
    return new HttpError(429, message);
  }
  if (
    message.includes("unsupported") ||
    message.includes("invalid") ||
    message.includes("expected") ||
    message.includes("does not allow") ||
    message.includes("requires live chain execution") ||
    message.includes("indexed execution is not implemented")
  ) {
    return new HttpError(400, message);
  }
  return new HttpError(500, message);
}
