import { z } from "zod";

const apiKeyRecordSchema = z.object({
  label: z.string(),
  signerId: z.string().optional(),
  allowGasless: z.boolean().default(false),
  roles: z.array(z.string()).default(["service"]),
});

const apiKeyMapSchema = z.record(z.string(), apiKeyRecordSchema);

export type AuthContext = z.infer<typeof apiKeyRecordSchema> & {
  apiKey: string;
};

export function loadApiKeys(env: NodeJS.ProcessEnv = process.env): Record<string, AuthContext> {
  const raw = env.API_LAYER_KEYS_JSON;
  if (!raw) {
    return {};
  }
  const parsed = apiKeyMapSchema.parse(JSON.parse(raw));
  return Object.fromEntries(
    Object.entries(parsed).map(([apiKey, value]) => [apiKey, { ...value, apiKey }]),
  );
}

export function authenticate(apiKeys: Record<string, AuthContext>, apiKey: string | undefined): AuthContext {
  if (!apiKey) {
    throw new Error("missing x-api-key");
  }
  const context = apiKeys[apiKey];
  if (!context) {
    throw new Error("invalid x-api-key");
  }
  return context;
}

