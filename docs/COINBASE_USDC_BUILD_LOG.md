# Coinbase/USDC daily build log

## Execution agreement

- Scope: implement the Coinbase/USDC funding specification in `docs/COINBASE_USDC_AND_API_READINESS_REVIEW.md`. Container hosting was disregarded by the user and is not part of this buildout. The separate 152-method ABI assurance backlog remains with the existing assurance workstreams.
- Schedule: daily at 16:00 America/Chicago, October 19–28, 2026, stopping earlier if every acceptance criterion is met. Ten days is the delivery target; external access or missing frontend source must be reported as blockers rather than counted as finished.
- Daily implementation target: finish five of the twenty baseline units below (25% of the original backlog), or all remaining units if fewer than five remain. Count a unit only when its implementation and meaningful acceptance tests pass. Report attempted and completed progress separately. Do not change the denominator to inflate progress.
- Delivery: commit the day's scoped code, tests and log; integrate and push to the actual remote default branch after all required gates pass. It currently resolves to `origin/master`; the user's reference to main means the default branch, not a request to invent a new branch named main. Never force-push or include unrelated work.
- Testing: full test suite, measured coverage, lint, TypeScript builds, generated API coverage and applicable actor/indexer/PostgreSQL/fork proofs. Skipped or unavailable required integration checks are blockers, not passing evidence.
- Environment: sandbox and disposable fork/test funds for automated acceptance. Real fiat charges, real-money transfers and production credentials/access approval remain external launch dependencies.

## Fixed baseline

Each unit includes implementation, validation, failure handling and meaningful tests. Status starts pending; no integration code has been completed by scheduling this automation.

| ID | Acceptance unit | Status |
| --- | --- | --- |
| C01 | Server-only Coinbase configuration, request-bound authentication and provider adapter | pending |
| C02 | Durable funding schema, migration, indexes and owner-scoped persistence | pending |
| C03 | Authenticated user/wallet binding and destination/chain/token validation | pending |
| C04 | Region, asset, network and payment-method eligibility endpoint | pending |
| C05 | Quote endpoint with exact decimal handling and disclosed fees | pending |
| C06 | Headless order creation with selected verification experience | pending |
| C07 | Secure hosted Coinbase-account checkout sessions | pending |
| C08 | Owner-scoped order lookup and normalized provider status | pending |
| C09 | Owner-scoped, paginated funding history | pending |
| C10 | Durable request idempotency and ambiguous-timeout recovery | pending |
| C11 | Raw-body webhook mounting, signature verification and replay protection | pending |
| C12 | Durable webhook inbox, deduplication and asynchronous processing | pending |
| C13 | Ordered state transitions for provider events, failures and late completion | pending |
| C14 | Reconciliation worker with retries, recovery and subscription health handling | pending |
| C15 | Exact chain/token/recipient settlement verification and unique credit identity | pending |
| C16 | Live USDC balance, spender allowance and gas/sponsorship readiness | pending |
| C17 | Bounded user-authorized USDC approval preparation and signer handoff | pending |
| C18 | Funding-to-purchase workflow with fresh listing/price/ownership validation | pending |
| C19 | Provider sandbox and fork/PostgreSQL end-to-end proof, including frontend handoff contract | pending |
| C20 | Release integration, full regression gates, rollout/rollback docs and external launch dependency verification | pending |

## Daily entries

### 2026-10-18 — scheduling setup

- User confirmed Coinbase/USDC scope and authorized daily commits and default-branch updates.
- Baseline: 0/20 complete; 20 pending. Research and scheduling are not implementation completion.
- Required daily entry fields: date/run number; starting/ending unit counts; IDs attempted/completed; original-baseline percentage; files changed; exact commands and pass/fail/skip results; evidence locations; blockers; next batch; commit SHAs; pushed remote/ref; CI status.
- Update this log and `CHANGELOG.md` on every run, including blocked runs. Never fabricate test results, remote CI success, transaction receipts or completion percentages.
