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
  private readonly redisLimiters: Record<RateLimitKind, Ratelimit> | null;
  private readonly local = new Map<string, LocalEntry>();

  constructor() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const redis = new Redis({ url, token });
      this.redisLimiters = {
        read: this.createRedisLimiter(redis, "read"),
        write: this.createRedisLimiter(redis, "write"),
        gasless: this.createRedisLimiter(redis, "gasless"),
      };
      return;
    }
    this.redisLimiters = null;
  }

  private createRedisLimiter(redis: Redis, kind: RateLimitKind): Ratelimit {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(this.limitFor(kind), "1 m"),
      analytics: false,
      prefix: `uspeaks-api:${kind}`,
    });
  }

  private limitFor(kind: RateLimitKind): number {
    return DEFAULT_LIMITS[kind];
  }

  async enforce(kind: RateLimitKind, identifier: string): Promise<void> {
    const limit = this.limitFor(kind);
    if (this.redisLimiters) {
      const result = await this.redisLimiters[kind].limit(identifier);
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
