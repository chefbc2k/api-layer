function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectErrorMessages(error: unknown, seen = new Set<unknown>()): string[] {
  if (error == null || seen.has(error)) {
    return [];
  }
  if (typeof error === "string") {
    return [error];
  }
  if (typeof error !== "object") {
    return [String(error)];
  }

  seen.add(error);

  const record = error as Record<string, unknown>;
  const messages: string[] = [];

  for (const key of ["shortMessage", "message", "reason"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      messages.push(value);
    }
  }

  for (const key of ["cause", "error", "info"]) {
    messages.push(...collectErrorMessages(record[key], seen));
  }

  return messages;
}

export function isRetryableRpcError(error: unknown): boolean {
  const message = collectErrorMessages(error).join(" ").toLowerCase();
  const retryableFragments = [
    "timeout",
    "429",
    "rate limit",
    "too many requests",
    "socket hang up",
    "connection reset",
    "econnreset",
    "sendrequest",
    "network error",
    "etimedout",
    "service unavailable",
    "bad gateway",
    "5xx",
  ];
  return retryableFragments.some((fragment) => message.includes(fragment));
}

export async function runWithTransientRpcRetries<T>(
  operation: () => Promise<T>,
  options: {
    label: string;
    maxAttempts?: number;
    baseDelayMs?: number;
    log?: (message: string) => void;
  },
): Promise<T> {
  const normalizedMaxAttempts = Number.isFinite(options.maxAttempts)
    ? Math.trunc(options.maxAttempts as number)
    : 3;
  const normalizedBaseDelayMs = Number.isFinite(options.baseDelayMs)
    ? Math.trunc(options.baseDelayMs as number)
    : 1_500;
  const maxAttempts = Math.max(1, normalizedMaxAttempts);
  const baseDelayMs = Math.max(0, normalizedBaseDelayMs);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableRpcError(error) || attempt >= maxAttempts) {
        throw error;
      }
      options.log?.(
        `${options.label} transient RPC failure on attempt ${attempt}/${maxAttempts}: ${
          String((error as { shortMessage?: string; message?: string })?.shortMessage ?? (error as { message?: string })?.message ?? error)
        }. Retrying...`,
      );
      await delay(baseDelayMs * attempt);
    }
  }

  throw lastError;
}
