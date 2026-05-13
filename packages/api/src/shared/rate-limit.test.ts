import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RateLimiter } from "./rate-limit.js";

async function importRateLimiterWithUpstashMocks() {
  const slidingWindow = vi.fn().mockReturnValue("window-config");
  const redisConstructor = vi.fn().mockImplementation(({ url, token }: { url: string; token: string }) => ({
    url,
    token,
  }));
  const ratelimitConstructor = vi.fn().mockImplementation((options: unknown) => ({
    options,
    limit: vi.fn(),
  }));

  vi.resetModules();
  vi.doMock("@upstash/redis", () => ({
    Redis: redisConstructor,
  }));
  vi.doMock("@upstash/ratelimit", () => ({
    Ratelimit: Object.assign(ratelimitConstructor, {
      slidingWindow,
    }),
  }));

  const rateLimitModule = await import("./rate-limit.js");
  return {
    RateLimiter: rateLimitModule.RateLimiter,
    redisConstructor,
    ratelimitConstructor,
    slidingWindow,
  };
}

describe("RateLimiter", () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces local per-kind limits", async () => {
    const limiter = new RateLimiter();

    for (let index = 0; index < 120; index += 1) {
      await expect(limiter.enforce("read", "reader")).resolves.toBeUndefined();
    }

    await expect(limiter.enforce("read", "reader")).rejects.toThrow("rate limit exceeded for read");
    await expect(limiter.enforce("write", "reader")).resolves.toBeUndefined();
    await expect(limiter.enforce("read", "other-reader")).resolves.toBeUndefined();
  });

  it("resets expired local buckets", async () => {
    const now = vi.spyOn(Date, "now");
    now.mockReturnValueOnce(10_000);
    const limiter = new RateLimiter();

    await limiter.enforce("gasless", "reader");
    for (let index = 1; index < 10; index += 1) {
      now.mockReturnValueOnce(10_001);
      await limiter.enforce("gasless", "reader");
    }
    now.mockReturnValueOnce(10_002);
    await expect(limiter.enforce("gasless", "reader")).rejects.toThrow("rate limit exceeded for gasless");

    now.mockReturnValueOnce(80_000);
    await expect(limiter.enforce("gasless", "reader")).resolves.toBeUndefined();
  });

  it("uses the redis limiter when upstash credentials are configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret";

    const limiter = new RateLimiter();
    const limit = vi.fn().mockResolvedValue({ success: true, remaining: 3 });
    (limiter as unknown as { redisLimiter: { limit: typeof limit } }).redisLimiter = { limit };

    await expect(limiter.enforce("write", "founder")).resolves.toBeUndefined();
    expect(limit).toHaveBeenCalledWith("write:founder");
  });

  it("rejects redis responses that report exhaustion", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret";

    const limiter = new RateLimiter();
    const limit = vi.fn().mockResolvedValue({ success: false, remaining: 0 });
    (limiter as unknown as { redisLimiter: { limit: typeof limit } }).redisLimiter = { limit };

    await expect(limiter.enforce("write", "founder")).rejects.toThrow("rate limit exceeded for write");
  });

  it("initializes the upstash redis limiter when both credentials are configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret";

    const {
      RateLimiter: MockedRateLimiter,
      ratelimitConstructor,
      redisConstructor,
      slidingWindow,
    } = await importRateLimiterWithUpstashMocks();

    new MockedRateLimiter();

    expect(redisConstructor).toHaveBeenCalledWith({
      url: "https://redis.example",
      token: "secret",
    });
    expect(slidingWindow).toHaveBeenCalledWith(120, "1 m");
    expect(ratelimitConstructor).toHaveBeenCalledWith({
      redis: { url: "https://redis.example", token: "secret" },
      limiter: "window-config",
      analytics: false,
      prefix: "uspeaks-api",
    });
  });

  it("falls back to the local limiter when upstash credentials are incomplete", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RateLimiter: MockedRateLimiter, ratelimitConstructor, redisConstructor } =
      await importRateLimiterWithUpstashMocks();
    const limiter = new MockedRateLimiter();

    await expect(limiter.enforce("write", "founder")).resolves.toBeUndefined();
    expect(redisConstructor).not.toHaveBeenCalled();
    expect(ratelimitConstructor).not.toHaveBeenCalled();
  });

  it("rejects redis responses with negative remaining capacity", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret";

    const limiter = new RateLimiter();
    const limit = vi.fn().mockResolvedValue({ success: true, remaining: -1 });
    (limiter as unknown as { redisLimiter: { limit: typeof limit } }).redisLimiter = { limit };

    await expect(limiter.enforce("gasless", "founder")).rejects.toThrow("rate limit exceeded for gasless");
  });
});
