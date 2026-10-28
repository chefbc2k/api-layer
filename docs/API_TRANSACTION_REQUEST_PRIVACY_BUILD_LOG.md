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


## 2026-10-28 — resumed delivery verification

The October 26 implementation was preserved by autosave commit `36cceff` before delivery. It was not credited as accepted. Starting open count remains 1; this run must complete 1 item (100% of the starting open count, exceeding the rounded-up 25% minimum). Resumed in the same isolated worktree on `codex/transaction-request-privacy-20261028`, based on fetched default `origin/master` `cc54b9cde612032289b304803fae6cc7ad5b19df`. Reapplied the scoped candidate as `0f3cb0b`; resolved only an unrelated generated timestamp conflict by retaining the current remote version. No older workstream code or reports were restored over the newer default branch.

Verification against this integrated baseline:

- `API_LAYER_DEPLOYMENT_MANIFEST=/Users/chef/Public/CONTRACTS/artifacts/release-readiness/deployment-manifest.json pnpm run build`: passed, including full code generation and all workspace TypeScript builds. Generator-only reviewed-surface timestamp churn was restored in this worktree.
- `pnpm exec tsc -b`: passed.
- `pnpm run lint`: passed.
- `pnpm run coverage:check`: passed at 492 wrapper functions, 218 event occurrences, 492 HTTP methods and 260/260 write invariants.
- `pnpm run test:indexer:postgres`: passed 26/26 across three files (16 funding, 6 indexer and 4 transaction-request privacy database cases), applying all migrations twice to disposable real PostgreSQL. This includes restart persistence, exact owner/signer isolation, explicit key rotation, preserved ownerless records and denied browser database access.
- `pnpm run test:actor-negative-paths`: passed 447/447 across 14 files.
- The first integrated `pnpm test` finished with 2,093 passing tests, 68 gated skips and one existing generated event-assurance timeout. That case stalled for 25 seconds against a 5-second timeout; the run took 1,501 seconds wall time. Its exact focused rerun passed in 101 milliseconds. No timeout was increased or assertion weakened. A canonical full retry is required before delivery and is recorded below.

Full logs are preserved under `.runtime/privacy-20261028-*.log` in this worktree. No live provider payment, production database migration, contract transaction or service deployment was performed. GitHub workflow inventory contains only platform-managed Copilot/Dependabot workflows; no repository build/test workflow was found. Exact-commit checks are inspected after push rather than claiming CI success.

- The second canonical retry again encountered a different existing event-assurance timeout (`TimewaveGiftFacet.VestingTransferred`, 175 seconds against 5 seconds) plus a Vitest task-update timeout, with 2,093 passing tests and 68 gated skips. Its exact focused rerun passed in 107 milliseconds. The host was exhibiting long wall-clock stalls between otherwise short tests. To address host idle suspension without weakening tests or changing unrelated indexer code, the final canonical run uses `/usr/bin/caffeinate -i pnpm test`. This inhibits idle sleep only while the command runs; all original assertions and timeouts remain unchanged.

- Final full canonical regression with idle sleep inhibited passed: **2,094 tests across 160 files**, **68 gated skips across five files**, zero failed tests or unhandled errors, 116 seconds. The 26 database skips were executed successfully by the separate disposable PostgreSQL gate; the remaining 42 live contract/red-team checks are not claimed as executed and are outside this lookup-only change. Final log: `.runtime/privacy-20261028-full-awake.log`.
- All required local checks for this scoped privacy fix now pass. No test timeout, assertion or global test configuration was weakened. Verified-source commit is `0f3cb0b`; the following documentation commit records the final gates. Acceptance remains pending successful remote-default delivery, whose exact receipt is appended after publication.


### Verified delivery receipt — October 28

- Atomic, non-force publication succeeded for `d064acffb157ce47447b699923e4e0b8c3104b73` to both `origin/master` and `origin/codex/transaction-request-privacy-20261028`. `git ls-remote` confirmed both refs at that exact SHA. It contains the scoped implementation `0f3cb0b` and the final local verification receipt; no unrelated changes were included.
- GitHub exact-commit check-runs returned zero checks; combined status returned zero contexts with a `pending` aggregate placeholder. The workflow inventory contained only platform-managed Copilot/Dependabot jobs. No remote build/test CI pass is claimed; local checks above are the observed verification gates.
- Accepted completion: **1 of 1 starting open items completed (100%)**, meeting the one-item rounded-up 25% requirement. Ending open items for this workstream: **0**. This closes source implementation and verified default-branch delivery, not production rollout.
- Required rollout remains explicit: apply migration 0008 before deploying the secured API. No production database or service was changed. Existing ownerless rows remain preserved and inaccessible. Other funding, frontend, settlement and exact-method write-proof backlogs are not credited to this workstream.
- The recurring privacy automation is now eligible for removal because its complete implementation and verified-delivery scope is satisfied. This documentation receipt updates the accepted status without changing the verified runtime/test source.
