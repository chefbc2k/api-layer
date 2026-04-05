import { afterEach, describe, expect, it, vi } from "vitest";

import { log } from "./logger.js";

describe("log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes info payloads to console.log", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-04-05T00:00:00.000Z");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("info", "hello", { requestId: "req-1" });

    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      level: "info",
      message: "hello",
      time: "2026-04-05T00:00:00.000Z",
      requestId: "req-1",
    }));
  });

  it("routes warn payloads to console.warn", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-04-05T00:00:00.000Z");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("warn", "careful");

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("routes error payloads to console.error", () => {
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2026-04-05T00:00:00.000Z");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    log("error", "broken", { txHash: "0xdead" });

    expect(errorSpy).toHaveBeenCalledWith(JSON.stringify({
      level: "error",
      message: "broken",
      time: "2026-04-05T00:00:00.000Z",
      txHash: "0xdead",
    }));
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
