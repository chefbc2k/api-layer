import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "dotenv";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoEnvPath = path.resolve(currentDir, "../../../../.env");
let cachedRepoEnv: NodeJS.ProcessEnv | null = null;

export type ConfigValueSource = ".env" | "env" | "missing";

export type RuntimeConfigSources = {
  envPath: string;
  values: Record<string, { value?: string; source: ConfigValueSource }>;
};

export function isAlchemyRpcUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().includes("alchemy");
  } catch {
    return url.toLowerCase().includes("alchemy");
  }
}

const configSchema = z.object({
  chainId: z.coerce.number().default(84532),
  cbdpRpcUrl: z.string().min(1),
  alchemyRpcUrl: z.string().min(1),
  diamondAddress: z.string().min(1),
  providerRecoveryCooldownMs: z.coerce.number().default(30_000),
  providerErrorWindowMs: z.coerce.number().default(60_000),
  providerErrorThreshold: z.coerce.number().default(5),
  enableGasless: z.coerce.boolean().default(false),
  finalityConfirmations: z.coerce.number().default(20),
  alchemyApiKey: z.string().min(1).optional(),
  alchemyDiagnosticsEnabled: z.coerce.boolean().default(false),
  alchemySimulationEnabled: z.coerce.boolean().default(false),
  alchemySimulationEnforced: z.coerce.boolean().default(false),
  alchemySimulationBlock: z.enum(["latest", "pending"]).default("pending"),
  alchemyTraceTimeout: z.string().default("5s"),
  alchemyEndpointDetected: z.coerce.boolean().default(false),
  exposeDiagnostics: z.coerce.boolean().default(false),
});

export type ApiLayerConfig = z.infer<typeof configSchema>;

export function loadRepoEnv(): NodeJS.ProcessEnv {
  if (cachedRepoEnv) {
    return cachedRepoEnv;
  }
  if (!existsSync(repoEnvPath)) {
    cachedRepoEnv = {};
    return cachedRepoEnv;
  }
  cachedRepoEnv = parse(readFileSync(repoEnvPath, "utf8"));
  return cachedRepoEnv;
}

function mergedEnv(): NodeJS.ProcessEnv {
  return { ...loadRepoEnv(), ...process.env };
}

function resolveValue(repoEnv: NodeJS.ProcessEnv, ...keys: string[]): string | undefined {
  for (const key of keys) {
    if (repoEnv[key] !== undefined) {
      return repoEnv[key];
    }
  }
  return undefined;
}

function resolveSource(...keys: string[]): { value?: string; source: ConfigValueSource } {
  const repoEnvOnly = loadRepoEnv();
  for (const key of keys) {
    if (process.env[key] !== undefined) {
      return { value: process.env[key], source: "env" };
    }
    if (repoEnvOnly[key] !== undefined) {
      return { value: repoEnvOnly[key], source: ".env" };
    }
  }
  return { source: "missing" };
}

export function readRuntimeConfigSources(env: NodeJS.ProcessEnv = mergedEnv()): RuntimeConfigSources {
  return {
    envPath: repoEnvPath,
    values: {
      RPC_URL: resolveSource("RPC_URL", "CBDP_RPC_URL"),
      ALCHEMY_RPC_URL: resolveSource("ALCHEMY_RPC_URL"),
      ALCHEMY_API_KEY: resolveSource("ALCHEMY_API_KEY"),
      CHAIN_ID: resolveSource("CHAIN_ID"),
      NETWORK: resolveSource("NETWORK"),
      DIAMOND_ADDRESS: resolveSource("DIAMOND_ADDRESS"),
      PRIVATE_KEY: resolveSource("PRIVATE_KEY"),
      ORACLE_WALLET_PRIVATE_KEY: resolveSource("ORACLE_WALLET_PRIVATE_KEY"),
    },
  };
}

export function readConfigFromEnv(env: NodeJS.ProcessEnv = mergedEnv()): ApiLayerConfig {
  const cbdpRpcUrl =
    resolveValue(env, "RPC_URL", "CBDP_RPC_URL");
  const alchemyRpcUrl =
    resolveValue(env, "ALCHEMY_RPC_URL") ??
    cbdpRpcUrl;
  const alchemyApiKey = resolveValue(env, "ALCHEMY_API_KEY");
  const alchemyEndpointDetected = isAlchemyRpcUrl(
    resolveValue(env, "ALCHEMY_RPC_URL", "RPC_URL", "CBDP_RPC_URL"),
  ) || isAlchemyRpcUrl(alchemyRpcUrl);
  const alchemyDiagnosticsDefault = Boolean(alchemyApiKey || alchemyEndpointDetected);

  return configSchema.parse({
    chainId: resolveValue(env, "CHAIN_ID") ?? 84532,
    cbdpRpcUrl,
    alchemyRpcUrl,
    diamondAddress: resolveValue(env, "DIAMOND_ADDRESS"),
    providerRecoveryCooldownMs: resolveValue(env, "API_LAYER_PROVIDER_RECOVERY_COOLDOWN_MS"),
    providerErrorWindowMs: resolveValue(env, "API_LAYER_PROVIDER_ERROR_WINDOW_MS"),
    providerErrorThreshold: resolveValue(env, "API_LAYER_PROVIDER_ERROR_THRESHOLD"),
    enableGasless: resolveValue(env, "API_LAYER_ENABLE_GASLESS") ?? false,
    finalityConfirmations: resolveValue(env, "API_LAYER_FINALITY_CONFIRMATIONS") ?? 20,
    alchemyApiKey,
    alchemyDiagnosticsEnabled: resolveValue(env, "API_LAYER_ENABLE_ALCHEMY_DIAGNOSTICS") ?? alchemyDiagnosticsDefault,
    alchemySimulationEnabled: resolveValue(env, "API_LAYER_ENABLE_ALCHEMY_SIMULATION") ?? alchemyDiagnosticsDefault,
    alchemySimulationEnforced: resolveValue(env, "API_LAYER_ENFORCE_ALCHEMY_SIMULATION") ?? false,
    alchemySimulationBlock: resolveValue(env, "API_LAYER_ALCHEMY_SIMULATION_BLOCK") ?? "pending",
    alchemyTraceTimeout: resolveValue(env, "API_LAYER_ALCHEMY_TRACE_TIMEOUT") ?? "5s",
    alchemyEndpointDetected,
    exposeDiagnostics: resolveValue(env, "API_LAYER_EXPOSE_DIAGNOSTICS") ?? false,
  });
}
