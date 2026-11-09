# API operations and rollout — November 8, 2026

## Production PostgreSQL

The API previously used disposable local PostgreSQL for assurance; no existing production database connection was configured in Vercel. At the user's request, a new Neon database was provisioned through the Vercel CLI and initialized on November 8.

| Setting | Value |
| --- | --- |
| Vercel team | `brandons-projects-890ec0a0` |
| Vercel project | `api-layer` |
| Vercel project ID | `prj_m4XEbbPjZlD7HX4Wn785o6kyApDI` |
| Database resource | `api-layer-production` |
| Vercel resource ID | `store_O3mRNTTGbHtXv5Q8` |
| Neon project ID | `hidden-cherry-73884296` |
| Database | `neondb` |
| Region | `iad1` / AWS US East |
| Plan at creation | `free_v3` (Free) |
| Pooled host | `ep-lucky-shape-bbzicba9-pooler.c-15.us-east-1.aws.neon.tech` |
| Connected environment | Production only |
| Runtime connection variable | `SUPABASE_DB_URL` (sensitive; pooled; `sslmode=verify-full`) |
| Migration connection variable | `DATABASE_URL_UNPOOLED` (integration-managed) |

[Manage the database in Vercel](https://vercel.com/d/dashboard/integrations/neon/icfg_UkC2xaYsZwYIQn5ImFltra4z/resources/store_O3mRNTTGbHtXv5Q8).

Provisioning command, executed from a checkout linked to the API project:

```sh
vercel integration add neon --name api-layer-production --plan free_v3 \
  --metadata region=iad1 --metadata auth=false \
  --environment production --no-env-pull
```

Do not repeat that provisioning command to reconnect an existing database. Use `vercel integration list api-layer` to find the resource. For local administration, retrieve the project environment with `vercel env pull .env.production.local --environment production`. Keep that file private and ignored; do not print or commit it. The integration manages `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and PostgreSQL aliases. The API/indexer currently expect the legacy name `SUPABASE_DB_URL`, which was separately configured as a sensitive production variable with the pooled connection value. This name does not mean the runtime uses Supabase hosting. Rotate/update this alias when the integration credentials rotate.

## Applied schema

The fresh database contained zero public tables before initialization. In one transaction, `db/bootstrap/standalone-postgres.sql` and every migration `0001` through `0009` were applied, including requested migration `0008_transaction_request_owner.sql`. Migration names and SHA-256 checksums are recorded in `public.api_layer_schema_migrations`; no existing local data was copied.

The standalone bootstrap provides non-login `anon`, `authenticated`, and `service_role` compatibility roles plus claim-reading `auth.uid()`/`auth.jwt()` helpers. Missing claims deny policy access. It preserves existing helper functions if they exist; do not replace managed Supabase authentication with these helpers. The server uses the private Neon connection; there is no browser database API or newly provisioned user authentication product.

Verification confirmed `tx_requests.owner_hash` and denied SELECT for `anon` and `authenticated`, while preserving SELECT for `service_role`. See `output/database-migration-2026-11-08.json`. The private request API still enforces its owner predicates; database initialization does not accept any Coinbase funding units or certify launch.

To inspect the migration ledger after securely loading the unpooled URL into the environment:

```sh
PGDATABASE="$DATABASE_URL_UNPOOLED" psql -v ON_ERROR_STOP=1 \
  -c 'select name, sha256, applied_at from public.api_layer_schema_migrations order by name'
```

Keep migration 0008 and owner data on application rollback. Do not restore unauthenticated transaction-request lookup. New migrations must be reviewed and applied with the unpooled connection before deploying code that requires them. Assurance tests must continue using disposable databases via `pnpm run test:indexer:postgres`; never point destructive assurance suites at this production database. The assurance runner now exercises the actual standalone bootstrap and all migrations repeatedly.

## Automation configuration

All 16 previously active automations remain ACTIVE. The 15 project cron jobs use `gpt-6-luna` with `low` reasoning to conserve credits. The Coinbase heartbeat runs at 08:00 and 20:00 America/Chicago on its existing chat; the automation tool does not expose model/reasoning overrides for heartbeat jobs, so that job inherits its chat settings. Paused jobs were left paused. ACTIVE means scheduled, not proof that a future invocation has executed.

The existing Coinbase job continues C01–C20 at 13/20 accepted, with F01 tracked separately. The exact-method proof job owns the reported 113/260, 147-remaining backlog, valid HTTP routes and missing access-control methods, real disposable PostgreSQL ingestion, receipt/post-state proof, and replay. The checked-in older proof artifact still reports 107/260 and 153 remaining: the job must reconcile newer receipts before certifying 113/260. Static coverage does not settle this discrepancy.

The economic-invariants job now explicitly owns open payout/accounting-without-beneficiary-credit blockers, treasury role provisioning, payment observability, access-control pause behavior, finance indemnity recovery, reconciliation, settlement approval/purchase, provider acceptance and lease proof. The consolidation job owns continued recovery of the outstanding branch audit.

## GitHub delivery and remaining rollout

The actual GitHub default branch is `master`. Consolidation uses an isolated `codex/consolidation-20261108` worktree and preserves the dirty primary checkout. Its snapshot includes the primary assurance work, funding actor evidence, fork nonce fixes, rights/staking/token tests and reviewed-metadata synchronization. An older timeout metadata change was attached to `emergencyStop`; reconciliation restored that method's event and applied the eventless policy to `setEmergencyTimeout`, matching contract source. The indexer inventory was updated accordingly.

Historical report-only branches were retained in merge ancestry while keeping newer reports. Exact reverse-patch checks identified two implementation branches already represented in the current code. The legacy coverage-runner test was superseded by the current stricter coverage tests. Tracked dependency symlinks were excluded. `output/branch-consolidation-audit-2026-11-08.json` lists every audited maximal tip and the remaining conflicts; this is not a claim that all branches are merged.

Database provisioning and migration are complete. The current Vercel project still uses the Other framework/root configuration and lacks the chain/RPC/key settings required to launch this Express API. A production API deployment has not been performed by this operation. Configure the server entrypoint/build and reviewed runtime settings, then deploy and validate the secured API. Coinbase production/provider and frontend acceptance remain separately open.

## Verification receipt

- Full regression: 2,730 passed, 73 environment-gated skips, 180 passing files (five gated files skipped).
- Real disposable PostgreSQL: 31/31 passed after applying the standalone bootstrap twice and all migrations twice.
- Focused receipt/indexer/metadata/configuration/rights-staking-token suites: 305/305 passed.
- TypeScript project builds (`pnpm exec tsc -b`), lint and full deployment-filtered `pnpm run build`: passed.
- Coverage runner passed: 95.75% statements, 94.29% branches, 97.12% functions and 96.12% lines.
- Explicit inventory check: 492 wrappers, 218 event occurrences, 492 HTTP methods and 260/260 write invariants.
- Guarded `pnpm run redteam:local-fork`: passed with the real local-fork probes enabled.
- No GitHub Actions workflow is configured in this repository; remote checks are inspected after delivery separately from these local gates.

The initial audit contained 78 distinct maximal outstanding tips. Twenty-one were integrated or reconciled as superseded/already-present work; 57 still require reconciliation, including historical conflict snapshots, the incompatible wider generated API inventory, and the Vitest-major dependency branch. The active daily consolidation automation is configured to work through this exact audit. Production database initialization does not resolve those code conflicts.
