import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalCache } from "./cache.js";

describe("LocalCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for missing keys", () => {
    const cache = new LocalCache();

    expect(cache.get("missing")).toBeNull();
  });

  it("returns stored values before their TTL expires", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(1_000);

    const cache = new LocalCache();
    cache.set("answer", { ok: true }, 60);

    nowSpy.mockReturnValue(30_000);
    expect(cache.get<{ ok: boolean }>("answer")).toEqual({ ok: true });
  });

  it("evicts expired entries on read", () => {
    const nowSpy = vi.spyOn(Date, "now");
    nowSpy.mockReturnValue(2_000);

    const cache = new LocalCache();
    cache.set("answer", "stale", 1);

    nowSpy.mockReturnValue(3_001);
    expect(cache.get("answer")).toBeNull();
    expect(cache.get("answer")).toBeNull();
  });
});
