import { createHash } from "node:crypto";
import type { AuthContext } from "./auth.js";

// Both identity and signer namespace come from server provisioning, never wallet headers.
// Explicit stable owner IDs permit key rotation; unconfigured keys remain isolated by key.
export function transactionRequestOwnerHash(auth: AuthContext): string {
  return createHash("sha256").update(JSON.stringify([
    "uspeaks-transaction-request-owner-v1",
    auth.requestOwnerId ? ["principal", auth.requestOwnerId] : ["api-key", auth.apiKey],
    auth.signerId ?? null,
  ])).digest("hex");
}
