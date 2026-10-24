import { z } from "zod";
import { HttpError } from "../shared/errors.js";

// Circle's native Base USDC. Sandbox pricing is simulated; it never funds Sepolia.
export const BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export const BASE_SEPOLIA_USDC = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";

const origin = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.origin === value && !url.username && !url.password
      && (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost"));
  } catch { return false; }
}, "Funding origins must be exact HTTPS origins (localhost HTTP is allowed)");

export type FundingConfig = {
  mode: "sandbox" | "live";
  apiKeyId: string;
  apiKeySecret: string;
  origins: string[];
  databaseUrl: string;
};

export function readFundingConfig(env: NodeJS.ProcessEnv = process.env): FundingConfig | null {
  if (env.API_LAYER_FUNDING_ENABLED === undefined || env.API_LAYER_FUNDING_ENABLED === "false") return null;
  if (env.API_LAYER_FUNDING_ENABLED !== "true") throw new Error("API_LAYER_FUNDING_ENABLED must be true or false");
  try {
    return {
      mode: z.enum(["sandbox", "live"]).parse(env.API_LAYER_FUNDING_MODE ?? "sandbox"),
      apiKeyId: z.string().min(1).parse(env.CDP_API_KEY_ID),
      apiKeySecret: z.string().min(1).parse(env.CDP_API_KEY_SECRET),
      origins: z.array(origin).min(1).parse(JSON.parse(env.API_LAYER_FUNDING_ORIGINS_JSON ?? "[]")),
      databaseUrl: z.string().url().refine(v => /^postgres(ql)?:/.test(v)).parse(env.SUPABASE_DB_URL),
    };
  } catch {
    // Do not expose Zod input values, connection strings or API secrets.
    throw new Error("Funding configuration requires valid mode, CDP credentials, approved origins and PostgreSQL URL");
  }
}

export function decimalUnits(value: string, decimals: number): bigint {
  if (!new RegExp(`^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,${decimals}})?$`).test(value)) {
    throw new HttpError(400, `Amount must be a decimal string with at most ${decimals} decimal places`);
  }
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0"));
}
