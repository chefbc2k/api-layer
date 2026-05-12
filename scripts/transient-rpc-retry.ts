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
  return (
    message.includes("timeout") ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("socket hang up") ||
    message.includes("connection reset") ||
    message.includes("econnreset") ||
    message.includes("sendrequest") ||
    message.includes("network error") ||
    message.includes("etimedout") ||
    message.includes("service unavailable") ||
    message.includes("bad gateway") ||
    message.includes("5xx")
  );
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
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 1_500);
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
