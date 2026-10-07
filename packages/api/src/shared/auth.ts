import { z } from "zod";

const apiKeyRecordSchema = z.object({
  label: z.string(),
  signerId: z.string().optional(),
  walletAddress: z.string().optional(),
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

const writeCapableRoles = new Set([
  "service",
  "founder",
  "admin",
  "operator",
  "buyer",
  "seller",
  "licensee",
  "collaborator",
]);

const adminCapableRoles = new Set([
  "service",
  "founder",
  "admin",
  "operator",
]);

function normalizedRoles(auth: AuthContext): string[] {
  return auth.roles.map((role) => role.trim().toLowerCase());
}

export function assertWriteAuthorized(auth: AuthContext): void {
  if (!normalizedRoles(auth).some((role) => writeCapableRoles.has(role))) {
    throw new Error("API key not permitted for write execution");
  }
}

export function assertRequestedWalletAuthorized(
  auth: AuthContext,
  requestedWalletAddress: string | undefined,
): void {
  if (
    auth.walletAddress
    && requestedWalletAddress
    && auth.walletAddress.toLowerCase() !== requestedWalletAddress.toLowerCase()
  ) {
    throw new Error("API key not permitted: configured walletAddress does not match x-wallet-address");
  }
}

export function assertAdminAuthorized(auth: AuthContext): void {
  if (!normalizedRoles(auth).some((role) => adminCapableRoles.has(role))) {
    throw new Error("API key not permitted for admin execution");
  }
}

function isLoopbackRpcUrl(rpcUrl: string): boolean {
  try {
    const hostname = new URL(rpcUrl).hostname.toLowerCase();
    const isIpv4Loopback = /^127(?:\.\d{1,3}){3}$/u.test(hostname);
    return hostname === "localhost"
      || hostname === "::1"
      || hostname === "[::1]"
      || isIpv4Loopback;
  } catch {
    return false;
  }
}

export function assertAdminNetworkAuthorized(
  rpcUrl: string,
  allowLiveAdminWrites = false,
): void {
  if (isLoopbackRpcUrl(rpcUrl) || allowLiveAdminWrites) {
    return;
  }
  throw new Error(
    "API key not permitted for live admin execution; set API_LAYER_ALLOW_LIVE_ADMIN_WRITES=true to opt in",
  );
}
