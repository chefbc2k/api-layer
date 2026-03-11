import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitKind = "read" | "write" | "gasless";

const DEFAULT_LIMITS: Record<RateLimitKind, number> = {
  read: 120,
  write: 30,
  gasless: 10,
};

type LocalEntry = {
  count: number;
  resetsAt: number;
};

export class RateLimiter {
  private readonly redisLimiter: Ratelimit | null;
  private readonly local = new Map<string, LocalEntry>();

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      this.redisLimiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(DEFAULT_LIMITS.read, "1 m"),
        analytics: false,
        prefix: "uspeaks-api",
      });
      return;
    }
    this.redisLimiter = null;
  }

  private limitFor(kind: RateLimitKind): number {
    return DEFAULT_LIMITS[kind];
  }

  async enforce(kind: RateLimitKind, identifier: string): Promise<void> {
    const limit = this.limitFor(kind);
    if (this.redisLimiter) {
      const result = await this.redisLimiter.limit(`${kind}:${identifier}`);
      if (!result.success || result.remaining < 0) {
        throw new Error(`rate limit exceeded for ${kind}`);
      }
      return;
    }

    const key = `${kind}:${identifier}`;
    const bucket = this.local.get(key);
    const currentTime = Date.now();
    if (!bucket || currentTime >= bucket.resetsAt) {
      this.local.set(key, { count: 1, resetsAt: currentTime + 60_000 });
      return;
    }
    if (bucket.count >= limit) {
      throw new Error(`rate limit exceeded for ${kind}`);
    }
    bucket.count += 1;
  }
}
