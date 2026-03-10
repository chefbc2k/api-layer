export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

