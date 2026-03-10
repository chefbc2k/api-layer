import { z } from "zod";

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
});

export type ApiLayerConfig = z.infer<typeof configSchema>;

export function readConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ApiLayerConfig {
  return configSchema.parse({
    chainId: env.API_LAYER_CHAIN_ID ?? env.CHAIN_ID ?? 84532,
    cbdpRpcUrl: env.CBDP_RPC_URL ?? env.RPC_URL,
    alchemyRpcUrl: env.ALCHEMY_RPC_URL,
    diamondAddress: env.API_LAYER_DIAMOND_ADDRESS ?? env.DIAMOND_ADDRESS,
    providerRecoveryCooldownMs: env.API_LAYER_PROVIDER_RECOVERY_COOLDOWN_MS,
    providerErrorWindowMs: env.API_LAYER_PROVIDER_ERROR_WINDOW_MS,
    providerErrorThreshold: env.API_LAYER_PROVIDER_ERROR_THRESHOLD,
    enableGasless: env.API_LAYER_ENABLE_GASLESS ?? false,
    finalityConfirmations: env.API_LAYER_FINALITY_CONFIRMATIONS ?? 20,
  });
}

