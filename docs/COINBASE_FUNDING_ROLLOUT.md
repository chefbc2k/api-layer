# Coinbase funding rollout and rollback

This runbook does not authorize launch. C19, C20 and F01 remain open in the shared readiness ledger. Keep funding and checkout disabled until the actual provider, consuming frontend, deployed marketplace/indexer and release evidence are reviewed. The native-USDC fixture proofs validate backend behavior, not those external acceptance items.

## Read-only database inspection

Securely load the existing deployment database connection into `API_LAYER_FUNDING_RELEASE_DB_URL`, then run:

```sh
pnpm run funding:release:inspect -- output/coinbase-usdc/funding-release-readiness.json
```

An optional private dotenv file can be supplied through `API_LAYER_FUNDING_RELEASE_ENV_FILE`; process environment overrides its values. Use the dedicated release DB variable explicitly. With Vercel exports, a sensitive alias can be empty while the integration-managed database URL is available; choose a nonempty connection privately, never print it. Do not provision another database to solve an empty export alias.

The inspector performs only catalog/history SELECTs in `BEGIN READ ONLY`, with connection/query timeouts. It compares every checked-in migration's SHA-256 to `api_layer_schema_migrations`, checks required funding tables, RLS, browser-role grants, service SELECT and valid unconditional unique settlement/purchase identities. It emits static names and booleans, never credentials, connection strings, customer records or balances. Exit 0 means the database inspection passed; exit 2 means incomplete/unconfigured/unavailable, exit 1 means command/configuration failure. `productionReleaseAccepted` always remains false: this tool does not inspect provider approval, frontend behavior, live contract semantics or CI.

The November 10 PM actual deployment inspection confirmed migrations 0010–0012 and their three tables/receipt identities absent, while recorded existing checksums and inspected permissions matched. See `output/coinbase-usdc/2026-11-10-pm-database-inspection.json`. It executed zero production writes.

## Before an enabled release

1. Confirm the actual consuming frontend repository and access. Implement F01: authenticated binding, approved origins/messages, checkout eligibility and disclosure, chain switch, pending/failed/abandoned/late status, exact approval/reset, explicit purchase consent and receipt handoff. Do not substitute MOLTSTUDIOS or a mock client. Document that `purchaseAsset(tokenId)` has no atomic seller/deadline fields; revalidate immediately before customer signature. A stronger guarantee requires a reviewed contract interface change.
2. Validate the correct CDP project, approved app domain, embedded capability, actual subscription ID/secret and exact callback URL. Store server credentials only in the server secret store. Run actual Coinbase sandbox acceptance without real charges, then the integrated deployed marketplace/indexer proof on a disposable fork. Keep synthetic provider responses and the marketplace fixture explicitly separate. C19 must retain the real order, callback/reconciliation, exact settlement and signed purchase/indexer evidence without customer PII or secrets.
3. Before code requiring new tables runs, review and apply the additive migrations 0010, 0011 and 0012 to the **existing** Neon using the private unpooled migration connection and the checksummed migration-history procedure in `OPERATIONS_ROLLOUT_2026-11-08.md`. Verify all prior applied checksums first; stop on mismatch. Back up existing records, apply the reviewed DDL/history updates atomically with `ON_ERROR_STOP`, and rerun the read-only inspector. The inspector itself never applies or repairs a migration.
4. Run `pnpm test`, `pnpm run test:coverage`, `pnpm exec tsc -b`, `pnpm run lint`, `pnpm run build` with the reviewed deployment manifest, `pnpm run coverage:check`, actor/red-team/indexer suites and `API_LAYER_FUNDING_RUN_FORK_PROOF=true pnpm run test:indexer:postgres`. Those database/fork suites create disposable services: never pass the production DB to their test variables. Keep any gated integration checks as blockers until executed. Preserve full logs and the exact source SHA.
5. Observe the new `.github/workflows/api-quality.yml` build/test CI for that exact SHA. It uses the committed frozen lock and provenance-labelled selector snapshot without production/provider secrets, and uploads measured coverage/fork evidence. A workflow file, push, skipped gated check or empty status-context list is not a successful run. Complete release artifact/deployment verification as C20, without reviving the disregarded container-hosting task in this automation.
6. At a separately reviewed release, keep payable creation off while validating authenticated owner isolation, raw webhook mounting, private persisted state, read-only worker connectivity and correct Base/native-USDC destination. Production mode requires chain 8453; Base Sepolia evidence cannot validate a Base production deployment. Enable each reviewed flag deliberately; record who/when/SHA/configuration changes and rollback owner. No production monetary acceptance is automated here.

## Rollback without losing financial state

Disable `API_LAYER_FUNDING_CHECKOUT_ENABLED` first to stop new payable creates. If stopping all funding HTTP surfaces is necessary, disable `API_LAYER_FUNDING_ENABLED`; understand that this also removes funded-customer readiness/purchase routes. Restore the last verified API build/configuration, retaining the encryption key and the additive schema. Do not drop funding tables, rewind migrations, erase inbox/events, change customer binding or reset provider references/idempotency keys.

Keep a compatible raw webhook receiver and read-only reconciliation/settlement workers running for existing attempts where possible. If receiver verification is faulty, stop accepting unauthenticated events, preserve durable inbox data, repair the receiver and use provider reconciliation; do not silently discard late completions or recreate charges. Workers require explicit enablement and compatible schemas; avoid running an older worker against newer semantics without tests. Record an interruption and resumable cursor when a worker must stop.

Preserve attempts marked uncertain, quarantined inbox events, immutable receipt identities, private purchase intents and late confirmations. Never unlock ambiguity merely because a checkout link expired or history was empty. Investigate against the unique provider reference and exact chain receipt; operator remediation must have an audit trail. Do not infer refunds, perform transfers or recreate an order as rollback. Escalate actual financial discrepancies to the responsible operator/provider, retaining private evidence.

Resume only after the fault is repaired and relevant failure-path and full release checks pass. Reconcile previously open attempts before reopening creation. Expiry of an unsigned response cannot revoke an already signed ERC20/purchase transaction; preserve receipt reconciliation for late customer submissions.
