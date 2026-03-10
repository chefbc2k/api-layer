import { JsonRpcProvider, type Provider } from "ethers";

import { log } from "./logger.js";

export type ProviderName = "cbdp" | "alchemy";
export type RequestKind = "read" | "write" | "events";

type ProviderRecord = {
  name: ProviderName;
  provider: JsonRpcProvider;
  errorTimestamps: number[];
};

export type ProviderRouterOptions = {
  chainId: number;
  cbdpRpcUrl: string;
  alchemyRpcUrl: string;
  errorWindowMs: number;
  errorThreshold: number;
  recoveryCooldownMs: number;
};

function now(): number {
  return Date.now();
}

function pruneErrors(record: ProviderRecord, errorWindowMs: number): void {
  const threshold = now() - errorWindowMs;
  record.errorTimestamps = record.errorTimestamps.filter((timestamp) => timestamp >= threshold);
}

function isRetryableError(error: unknown): boolean {
  const message = String((error as { message?: string })?.message ?? error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("429") ||
    message.includes("too many requests") ||
    message.includes("5xx") ||
    message.includes("bad gateway") ||
    message.includes("service unavailable")
  );
}

export class ProviderRouter {
  private readonly providers: Record<ProviderName, ProviderRecord>;
  private active: ProviderName = "cbdp";
  private lastFailoverAt = 0;

  constructor(private readonly options: ProviderRouterOptions) {
    this.providers = {
      cbdp: {
        name: "cbdp",
        provider: new JsonRpcProvider(options.cbdpRpcUrl, options.chainId),
        errorTimestamps: [],
      },
      alchemy: {
        name: "alchemy",
        provider: new JsonRpcProvider(options.alchemyRpcUrl, options.chainId),
        errorTimestamps: [],
      },
    };
  }

  getStatus(): Record<ProviderName, { errorCount: number; active: boolean }> {
    return {
      cbdp: {
        errorCount: this.providers.cbdp.errorTimestamps.length,
        active: this.active === "cbdp",
      },
      alchemy: {
        errorCount: this.providers.alchemy.errorTimestamps.length,
        active: this.active === "alchemy",
      },
    };
  }

  private markFailure(record: ProviderRecord, method: string, kind: RequestKind, error: unknown): void {
    record.errorTimestamps.push(now());
    pruneErrors(record, this.options.errorWindowMs);
    log("warn", "provider request failed", {
      chain: this.options.chainId,
      provider: record.name,
      method,
      kind,
      retryCount: 0,
      errorClass: (error as { name?: string })?.name ?? "Error",
      failoverReason: String((error as { message?: string })?.message ?? error),
      errorCount: record.errorTimestamps.length,
    });
  }

  private maybeFailover(record: ProviderRecord): void {
    pruneErrors(record, this.options.errorWindowMs);
    if (record.name !== "cbdp") {
      return;
    }
    if (record.errorTimestamps.length < this.options.errorThreshold) {
      return;
    }
    this.active = "alchemy";
    this.lastFailoverAt = now();
    log("warn", "provider failover activated", {
      chain: this.options.chainId,
      from: "cbdp",
      to: "alchemy",
      kind: "events",
      method: "provider.health",
      retryCount: 0,
      failoverReason: "rolling_error_threshold",
      windowMs: this.options.errorWindowMs,
      errorThreshold: this.options.errorThreshold,
    });
  }

  private async maybeRecoverPrimary(): Promise<void> {
    if (this.active !== "alchemy") {
      return;
    }
    if (now() - this.lastFailoverAt < this.options.recoveryCooldownMs) {
      return;
    }
    try {
      await this.providers.cbdp.provider.getBlockNumber();
      this.active = "cbdp";
      this.providers.cbdp.errorTimestamps = [];
      log("info", "provider primary recovered", {
        chain: this.options.chainId,
        provider: "cbdp",
        method: "provider.health",
        kind: "events",
        retryCount: 0,
        failoverReason: "cooldown_probe_success",
      });
    } catch {
      this.lastFailoverAt = now();
    }
  }

  async withProvider<T>(kind: RequestKind, method: string, callback: (provider: Provider, providerName: ProviderName) => Promise<T>): Promise<T> {
    await this.maybeRecoverPrimary();
    const primary = this.providers[this.active];
    const secondary = this.active === "cbdp" ? this.providers.alchemy : this.providers.cbdp;
    let retryCount = 0;

    try {
      const result = await callback(primary.provider, primary.name);
      log("info", "provider request ok", {
        chain: this.options.chainId,
        provider: primary.name,
        kind,
        method,
        retryCount,
        failoverReason: primary.name === "alchemy" ? "primary_unhealthy" : null,
      });
      return result;
    } catch (error) {
      this.markFailure(primary, method, kind, error);
      this.maybeFailover(primary);
      if (!isRetryableError(error)) {
        throw error;
      }
      retryCount += 1;
      const result = await callback(secondary.provider, secondary.name);
      log("info", "provider request ok after failover", {
        chain: this.options.chainId,
        provider: secondary.name,
        kind,
        method,
        retryCount,
        failoverReason: "retryable_upstream_error",
      });
      return result;
    }
  }
}
