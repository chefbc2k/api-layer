# Transaction-request privacy build log

## Acceptance and ownership

One open acceptance item: authenticated, owner-scoped access to private transaction-request records, trusted owner binding at creation, durable isolation, non-disclosing errors and regression verification. Start: 1 open; per-run minimum `ceil(0.25 * 1) = 1`. Completion requires the full item and verified remote-default delivery; tests or substeps alone do not count as independent completed items.

## 2026-10-26 — run 1

Started from fetched `origin/master` `3abb8ba` in the isolated managed worktree `/Users/chef/.codex/worktrees/transaction-request-privacy-20261026/api-layer`, branch `codex/transaction-request-privacy-20261026`. The dirty primary checkout and other automations' worktrees were left unchanged. The October 25 current-readiness Markdown/JSON named in the prompt were absent from this remote baseline; current Coinbase scope was read from its build log, and this workstream creates an October 26 scoped readiness update rather than recreating or overwriting unrelated proof counts.

### Implementation

- Authenticate against the current server API-key map before ID validation or private storage access; rate limit by the trusted owner identity and require a UUID request ID.
- Bind every direct/signature and CDP smart-wallet transaction-request insertion to an owner hash. The hash covers a domain-separated principal namespace and logical signer ID. An optional server-provisioned `requestOwnerId` enables deliberate API-key rotation for the same principal and signer. Without it, requests are scoped to the individual API key. Wallet addresses and mutable labels never grant ownership.
- Add migration 0008 and query by both UUID and owner hash. Legacy rows remain intact with a null owner hash and are inaccessible through lookup. Another owner, a missing record and an ownerless record all return the same 404. Changing signer identity cannot inherit records just by reusing a principal. Revoked/invalid keys cannot authenticate. There is no implicit administrator bypass.
- Remove the unscoped store lookup API, strip internal owner hashes from customer responses, disable caching and redact private storage errors. Public chain receipt lookup remains public.
- Revoke browser database-role access to private request records, including previously possible direct requester-ID access; grant service-only table access while retaining row-level security. Existing Supabase service-role policy remains in place. The application supplies the owner predicate for every customer lookup.

### Deployment and compatibility

Apply `db/migrations/0008_transaction_request_owner.sql` before deploying the new API binary. The migration is additive/idempotent and does not rewrite existing rows. New code fails closed if the migration is missing; both request storage and private lookup become unavailable instead of disclosing data. No production database or service was modified by this automation.

Provision `requestOwnerId` only through trusted server configuration in `API_LAYER_KEYS_JSON`; it must be a unique opaque principal ID, not a wallet address or user-facing label. Keys intentionally sharing a principal and logical signer can read the same principal's records. Replacing key material while retaining that principal/signer preserves access. Changing the logical signer or adding a principal to a previously fallback-scoped key changes its scope; historical recovery then needs a separate audited migration. Do not infer ownership of old rows from labels, caller headers or shared wallet addresses. Revoking a configured key requires refreshing/restarting the runtime key map under the existing deployment model.

Private lookup now requires `x-api-key` and returns 401 for absent/invalid keys, 400 for an authenticated malformed ID, 404 for missing or unauthorized records and a generic 503 on storage failure. With persistence disabled, request creation continues to return null request IDs and lookup returns 404; there is no in-memory fallback that bypasses ownership. Public `GET /v1/transactions/:txHash` remains unchanged.

Rollback: retain migration 0008 and owner data. Do not restore the vulnerable unauthenticated handler. If runtime rollback is required, block the private request-lookup endpoint at the gateway until a secured version is restored. No endpoint silently grants access to legacy rows.

### Verification and delivery

Exact command results and delivery receipt are appended after the final checks complete. Initial offline dependency setup lacked the ignored lockfile; copied the existing primary lockfile into the isolated worktree and `pnpm install --offline --frozen-lockfile` succeeded without downloading. Initial focused run found one incomplete test mock after adding authentication; the mock now partially imports real authentication and the final focused rerun passed.
