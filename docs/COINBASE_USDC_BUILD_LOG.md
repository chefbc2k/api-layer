# Coinbase/USDC daily build log

## Execution agreement

- Scope: implement the Coinbase/USDC funding specification in `docs/COINBASE_USDC_AND_API_READINESS_REVIEW.md`. Container hosting was disregarded by the user and is not part of this buildout. The separate 152-method ABI assurance backlog remains with the existing assurance workstreams.
- Schedule: daily at 16:00 America/Chicago, October 19–28, 2026, stopping earlier if every acceptance criterion is met. Ten days is the delivery target; external access or missing frontend source must be reported as blockers rather than counted as finished.
- Daily implementation target: finish five of the twenty baseline units below (25% of the original backlog), or all remaining units if fewer than five remain. Count a unit only when its implementation and meaningful acceptance tests pass. Report attempted and completed progress separately. Do not change the denominator to inflate progress.
- Delivery: commit the day's scoped code, tests and log; integrate and push to the actual remote default branch after all required gates pass. It currently resolves to `origin/master`; the user's reference to main means the default branch, not a request to invent a new branch named main. Never force-push or include unrelated work.
- Testing: full test suite, measured coverage, lint, TypeScript builds, generated API coverage and applicable actor/indexer/PostgreSQL/fork proofs. Skipped or unavailable required integration checks are blockers, not passing evidence.
- Environment: sandbox and disposable fork/test funds for automated acceptance. Real fiat charges, real-money transfers and production credentials/access approval remain external launch dependencies.

## Current schedule and separate frontend item

The October 25 follow-up instruction supersedes the original October 28 deadline. Continue daily until C01–C20 **and F01** are accepted and delivered. Each run snapshots all open items, including externally blocked items, and targets `ceil(open * 0.25)` completions. F01 is the actual consuming frontend wallet/checkout/approval/purchase integration; it remains open and is not included in the historical 20-unit denominator. The October 25 backend delivery accepted 10/20, despite older recovered documents listing only five.

| Separate item | Status | Required action |
| --- | --- | --- |
| F01 | open, frontend repository unconfirmed | Identify the USpeaks consuming frontend repository/path and grant source access; implement and verify the complete wallet-to-purchase user flow there |

## Fixed baseline

Each unit includes implementation, validation, failure handling and meaningful tests. Status starts pending; no integration code has been completed by scheduling this automation.

| ID | Acceptance unit | Status |
| --- | --- | --- |
| C01 | Server-only Coinbase configuration, request-bound authentication and provider adapter | complete (2026-10-23) |
| C02 | Durable funding schema, migration, indexes and owner-scoped persistence | complete (2026-10-23) |
| C03 | Authenticated user/wallet binding and destination/chain/token validation | complete (2026-10-23) |
| C04 | Region, asset, network and payment-method eligibility endpoint | complete (2026-10-23) |
| C05 | Quote endpoint with exact decimal handling and disclosed fees | complete (2026-10-23) |
| C06 | Headless order creation with selected verification experience | complete (2026-10-25) |
| C07 | Secure hosted Coinbase-account checkout sessions | complete (2026-10-25) |
| C08 | Owner-scoped order lookup and normalized provider status | complete (2026-10-25) |
| C09 | Owner-scoped, paginated funding history | complete (2026-10-25) |
| C10 | Durable request idempotency and ambiguous-timeout recovery | partial; unknown-provider recovery pending |
| C11 | Raw-body webhook mounting, signature verification and replay protection | complete (2026-10-25) |
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

### 2026-10-19 — run 1, interrupted setup

- Created the isolated managed checkout at `/Users/chef/.codex/worktrees/coinbase-usdc-20261019/api-layer` from `origin/master` (`9240b8b`). No implementation or verification completed before interruption. Starting/ending count 0/20; daily target missed. No default-branch push.

### 2026-10-20 — run 2, pricing implementation

- Attempted C01–C05 (5/20, 25% of the original baseline). Implemented the provider adapter, quote schema/persistence, authenticated customer destination checks, eligibility and non-payable pricing endpoints. Candidate implementation complete; full gates were still pending when interrupted, so accepted count remained 0/20.
- Funding suite passed 61/61; disposable PostgreSQL suite passed 14/14 (8 funding and 6 indexer). The initial package-by-package no-emit invocation failed because indexer referenced unbuilt client declarations; the repository build-mode command `pnpm exec tsc -b` resolved the reference ordering. Typecheck, lint and complete build then passed in sequence. No live provider request, fiat charge or chain transfer was executed.
- Work was subsequently preserved by the branch-consolidation automation in `c46f44a`; that autosave also captured three local dependency symlinks, which must be removed from delivered source. No default-branch push.

### 2026-10-21 — run 3, regression verification

- Continued the same C01–C05 batch; did not count or begin another batch. Accepted count remained 0/20. Actor negatives passed 351/351; red-team passed 115/115; indexer assurance passed 267 active tests with 6 PostgreSQL cases gated in the standalone suite (separately executed successfully by the PostgreSQL runner). Generated surface gates passed at 492 functions, 218 event occurrences and 260 write invariants.
- Full regression failed: 1 assertion failure plus 1 suite-loading timeout, with 1,951 passing and 48 skipped tests. The assertion hard-coded `/Public` instead of resolving the checkout's parent; the timeout occurred while loading `rights-aware-commercialize-voice-asset.test.ts`. Coverage did not run because the chained full test command failed. No failing batch was pushed to the default branch. Daily accepted-progress target missed.

### 2026-10-22 — run 4, interrupted recovery

- No new acceptance unit or proof completed. The consolidation automation retained reviewed-surface timestamp normalization in `da25336`; source implementation remained in the earlier autosave. Accepted count 0/20; no default-branch push; daily target missed.

### 2026-10-23 — run 5, verification and delivery in progress

- Branch `codex/coinbase-usdc-20261023` preserves only the existing funding batch based on remote default `master`. Attempted C01–C05: 5/20 = 25%; accepted count remains 0/20 until the required rerun finishes.
- Fixed the unrelated debug test's absolute `/Public` assumption to assert the actual parent path. Removed the accidentally tracked dependency symlinks from delivery and expanded the dependency ignore rule to cover symlinks too. Added `docs/COINBASE_FUNDING_API.md` for actual endpoint/configuration behavior and explicit sandbox limitations.
- Rechecking the failed suites, full tests, measured coverage and final source gates. Detailed evidence is in this checkout's `.runtime/coinbase-*.log`; final results, commits and delivery refs will be appended before declaring acceptance.
- GitHub lists only platform-managed Copilot and Dependabot workflows; no repository build/test CI workflow is configured. A successful push must not be called CI success.
- Next batch after acceptance: C06–C10. Required future launch actions: obtain Coinbase production/embedded access and configured CDP credentials, provide the consuming frontend repository and run provider sandbox/settlement acceptance. No production funding path is enabled by this release.

#### Run 5 final acceptance

- Starting accepted baseline 0/20; attempted C01–C05 = 25%; completed C01–C05 = 5/20 (25%); remaining C06–C20 = 15/20. Earlier missed days are not counted as completed work.
- `pnpm exec vitest run scripts/alchemy-debug-lib.test.ts packages/api/src/workflows/rights-aware-commercialize-voice-asset.test.ts --maxWorkers 1`: 65/65 passed after the portable-path fix.
- `pnpm test`: 1,963 passed, 48 environment-gated skips, 153 passing files and four skipped files; no failed tests or suites on the final run. The skipped database cases were executed separately below. Skipped live/settlement gates are not evidence for C19/C20, which remain pending.
- `pnpm run test:coverage`: exit 0; statements 97.49%, branches 96.56%, functions 98.06%, lines 97.60%. These are measured results, not a claim of 100% coverage. Funding storage has separate real-database acceptance rather than a claim of measured coverage in the no-database shard.
- Final quality sequence `pnpm exec tsc -b`, `pnpm run lint`, and `API_LAYER_DEPLOYMENT_MANIFEST=/Users/chef/Public/CONTRACTS/artifacts/release-readiness/deployment-manifest.json pnpm run build`: all passed. The explicit manifest path supplies the existing local deployment baseline to the isolated worktree; it is not a secret.
- `pnpm run coverage:check`: passed (492 functions, 218 event occurrences, 260/260 write invariants). `pnpm run test:actor-negative-paths`: 351 passed. `pnpm run test:redteam`: 115 passed. `pnpm run test:indexer:assurance`: 267 passed with six database gates, subsequently executed by the PostgreSQL runner.
- Final `pnpm run test:indexer:postgres`: 14/14 passed (eight funding and six indexer), migration applied twice. No required funding database check remains skipped.
- `pnpm exec tsx .runtime/funding-rpc-proof.ts`: real local Anvil EVM, normal contract-inspection implementation; matching USDC returned 200, wrong token 409, wrong chain 409. Provider eligibility data was an explicit synthetic fixture. No external RPC, live chain write or fiat charge occurred. Receipt/settlement write-fork proof is not applicable to this read-only pricing batch; it remains required for later settlement work.
- Durable summary: `output/coinbase-usdc/2026-10-23-verification.json`; full command logs remain in the attached worktree under `.runtime/coinbase-*.log`. Recovery commits `c46f44a`, `da25336` and `6169aa8` preserve the interrupted work; delivery is a clean scoped commit excluding transient symlinks and generator timestamp churn. Default-branch push and exact-commit remote check status will be recorded in a delivery receipt after verification.
- No release/production completion is claimed. C06–C10 are next; Coinbase onboarding, real provider sandbox acceptance, settlement proofs and consuming frontend integration remain open.

#### Run 5 delivery receipt

- Clean implementation commit: `83bbf8aaba002e670475fd9d0a514bd2356dcfd3` (`feat(api): add verified Coinbase USDC eligibility and quote foundation`). The delivery tree was verified identical to the tested recovery tree before publication.
- Atomic non-force push succeeded to `origin/master` and `origin/codex/coinbase-usdc-20261023`. `git ls-remote` confirmed both refs at that exact commit. The primary checkout and other worktrees were not reset or moved.
- GitHub check-runs returned zero checks for the implementation SHA; combined status returned zero status contexts (its aggregate placeholder was `pending`). No build/test CI workflow or successful remote CI run is claimed. Local verification results above are the delivery gates.
- This documentation receipt is committed and pushed separately; it changes no runtime/test source. Completion is 5/20 (25%); automation stays active for C06–C20.

### 2026-10-24 — run 6, checkout batch interrupted

- Starting/ending accepted count 5/20 (25%). Attempted C06–C10 = 5/20 (25%); completed 0 pending full gates. Candidate checkout endpoints, encrypted checkout storage and reservation/idempotency migration were implemented. Focused funding tests passed 83/83 and `pnpm exec tsc -b` passed. Full gates and database concurrency proof had not finished before interruption. No default push; daily target missed. Autosave `7818b14` preserved the exact scoped files.

### 2026-10-25 — run 7, checkout and raw webhook verification

- Fetched origin and resolved actual default `master`; it remained at `5e07364`. The primary checkout was dirty with unrelated assurance work. Reused the clean isolated Coinbase worktree, created `codex/coinbase-usdc-20261025` from origin/master and carried only the scoped checkout autosave via `c273c87`. No prior entry existed for today.
- Starting accepted count 5/20 (25%). Attempted C06–C10 and C11 = 6/20 (30%). C10 remains partial: durable reservations and retries prevent duplicate creation and recover a lost database acknowledgement, but provider success followed by an unknown timeout without an order ID is not yet reconciled. A locked attempt is not counted as recovery. C12 has an inbox foundation but no asynchronous worker and is not counted complete.
- Implemented embedded Headless orders, secure hosted sessions, owner-scoped lookup/history, encrypted URLs/tokens, strict request fingerprints and persisted ambiguous states; added raw webhook mounting before JSON, authenticated signed bytes/headers, five-minute timestamp window, durable replay identity and acknowledgement-after-persistence. Provider status is explicitly unverified settlement.
- Real PostgreSQL concurrency testing initially failed 1/20: competing unique indexes could reject an identical idempotency key. Corrected conflict handling at the INSERT and verified one creator among 12 simultaneous writers, persisted locks across independent connections, owner isolation, cursor ordering and collision rejection. Final database suite passed 22/22 (16 funding, 6 indexer), all migrations applied twice. Signature/funding tests passed 91/91 with 16 database gates separately executed. An initial webhook typecheck found implicit-any from Object.fromEntries; added an explicit string-record contract and reran the quality sequence.
- Required full regression/coverage and final delivery receipt pending; no additional unit is accepted until all applicable gates finish. Logs: `.runtime/coinbase-20261025-*.log` in the attached worktree. Next priorities are C10 recovery plus C12–C15 processing/reconciliation/settlement. External actions: Coinbase production/embedded approval and CDP sandbox credentials, approved frontend origin and consuming frontend source, deployment PostgreSQL, and real provider sandbox acceptance. No live charge, transfer or production enablement occurred.

#### Run 7 final acceptance

- Before 5/20 (25%); attempted C06–C11 = 6/20 (30%); completed C06–C09 and C11 = 5/20 (25% original baseline); after 10/20 (50%). C10 and C12–C20 remain unaccepted. Durable inbox groundwork does not count as the asynchronous processing unit. Provider fixture tests do not count as sandbox acceptance. October 24 added no accepted units.
- Focused `pnpm exec vitest run packages/api/src/funding --maxWorkers 1`: 91 passed, 16 database gates; all 16 executed separately. Verified the current SDK schema uses `ONRAMP_ORDER_STATUS_PENDING_AUTH`; corrected the candidate's invented pending-verification value and reran the affected suite (91 passed). Provider reference links and checkout settings are documented in `docs/COINBASE_FUNDING_API.md`.
- `pnpm run test:indexer:postgres`: 22/22 passed (16 funding, six indexer), applying migrations 0001–0007 twice. Tests cover simultaneous creates, persisted ambiguity/restart, lost acknowledgement, owner isolation, equal-timestamp history cursors, role denial, concurrent webhook deduplication and content/type collisions.
- Final `pnpm test` rerun passed 1,993, skipped 56 environment-gated tests, zero failures; 155 passing files/four skipped. The preceding run had 1,992 passes and one existing event-assurance timeout (RoyaltyPaid); retained the failure log. The retry passed with the normal configuration, without weakening timeouts/assertions. Database skips were executed above; remaining live/fork gates relate to later unaccepted release units.
- `pnpm run test:coverage` first failed on an existing event-assurance TokensVested timeout and worker RPC timeout. Retried for that unresolved failure: exit 0, statements 96.84%, branches 95.79%, functions 97.51%, lines 97.09%. Exact final log `.runtime/coinbase-20261025-coverage-retry.log`; measured summary copied to the durable proof artifact. No skipped/live check is credited as production evidence.
- Final quality sequence `pnpm exec tsc -b`, `pnpm run lint`, `API_LAYER_DEPLOYMENT_MANIFEST=/Users/chef/Public/CONTRACTS/artifacts/release-readiness/deployment-manifest.json pnpm run build`: all exit 0. Logs end in `types-release`, `lint-release`, `build-release`. Generated surface timestamp-only churn was removed after review; all substantive generated outputs remained stable.
- `pnpm run coverage:check` exit 0: 492 functions/HTTP methods, 218 event occurrences, 260/260 write invariants. `pnpm run test:actor-negative-paths` 351 passed (rerun after raw-route mount). `pnpm run test:redteam` 115 passed. `pnpm run test:indexer:assurance` 267 passed, six database skips separately executed. No assertion failure remains unresolved in these gates.
- `pnpm exec tsx .runtime/funding-rpc-proof.ts` passed using disposable local Anvil: real default contract inspection returned matching 200, token mismatch 409, chain mismatch 409. Provider eligibility data was synthetic; no chain writes/receipt settlement were introduced by this batch. Settlement/indexer end-to-end proof remains required for C15/C19/C20 and has not passed yet.
- Source commits `c273c87` (carried scoped checkout candidate) and `e47c99549d7fbe58ff0b3c9e5fa53320461f31d8` (verified checkout correction/raw ingestion). Evidence summary: `output/coinbase-usdc/2026-10-25-verification.json`; detailed logs retained in attached worktree `.runtime/coinbase-20261025-*`. Default push and observed exact-SHA CI status follow in a delivery receipt.
- Deadline risk: ten units remain with three scheduled days after today; full release by October 28 is not established. Obtain Coinbase embedded/production access, sandbox credentials, approved frontend origin/source and deployment PostgreSQL; independently finish C10/C12–C18 and then genuine C19/C20 proofs. No external approval or credential presence was inferred from fixture tests.

#### Run 7 delivery receipt

- Atomic non-force push succeeded to `origin/master` and `origin/codex/coinbase-usdc-20261025` at `4972672ac5807edcd25a4e608e88c53053e2b777`. `git ls-remote` confirmed both exact refs. The fetched default had no intervening commits to incorporate. The primary checkout/user edits were untouched.
- GitHub exact-SHA check-runs: zero; status contexts: zero. Aggregate placeholder is `pending`, with no actual build/test job configured or running. Only platform-managed Copilot/Dependabot workflows exist. Local gates passed; remote CI success is not claimed.
- This receipt is a documentation-only follow-up commit pushed to the same two refs. Runtime source remains `e47c995`; accepted count remains 10/20 (50%). Automation remains active within the original October 28 deadline; no extension or production completion is claimed.

### Interrupted runs — October 26 through November 3 (retrospective entry recorded November 4)

These entries are late recovery accounting, not claims that daily delivery or quotas were achieved. The source stayed scoped and no additional acceptance was certified. Historical accepted count remained 10/20 (50%), with C10/C12–C20 and F01 open (11 items; rounded-up daily minimum three).

| Date / run | Attempted | Completed | Evidence / outcome |
| --- | --- | --- | --- |
| 2026-10-26 / 8 | none evidenced | 0 | No completed implementation/test artifact or default delivery found. Target missed. |
| 2026-10-27 / 9 | C12, C13, C16 (3/20 = 15%) | 0 | Candidate worker/lifecycle/readiness, scoped read-only authorization and sandbox fixes. Initial funding suite 98 passed; PostgreSQL 26 passed. Later focused suite failed to load readiness tests because `%j` formatted BigInt fixture titles: 101 passed, 21 database gates, one failed suite. Full gates not completed. |
| 2026-10-28 / 10 | same unfinished batch | 0 | Autosave `b1b25f3` preserved the scoped candidate; no acceptance/default push. |
| 2026-10-29 / 11 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |
| 2026-10-30 / 12 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |
| 2026-10-31 / 13 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |
| 2026-11-01 / 14 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |
| 2026-11-02 / 15 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |
| 2026-11-03 / 16 | none newly evidenced | 0 | No new verified unit or full gate receipt; target missed. |

No external blocker is used to excuse those interrupted verification gaps. Required all-repository checks were unfinished, not passing. The existing Coinbase/frontend launch prerequisites remained open throughout. Nothing was force-pushed or promoted to production.

### 2026-11-04 — run 17, finish durable events and wallet readiness

- Starting accepted C01–C09/C11 = 10/20 (50%); starting open snapshot C10, C12, C13, C14, C15, C16, C17, C18, C19, C20, F01 = 11. Minimum `ceil(11 * .25) = 3`. Selected C12/C13/C16 = 3/20 (15% historical baseline), 3/11 (27.27%) of starting open items. Completion pending final gates; no planning or blocked guard is counted.
- Fetched origin/default `master`, observed `14fa7ac`; primary checkout remains owned by other work. Created `codex/coinbase-usdc-20261104` from latest default and carried only Coinbase autosave `b1b25f3`. Resolved two integration conflicts by preserving privacy migration 0008 and actor inventory, assigning funding migration 0009. Candidate carry commit `b54db7f` retains the entire scoped implementation without merging the arbitrary recovery branch history.
- Inspected the alternate October 25 sandbox candidate in `3c1f50b`. Its old order implementation/migration would replace delivered encrypted sessions/raw ingestion, so preserved its branch and ported the relevant read-only denial, sandbox payment flags, actor inventory and readiness documents into the current API design. Kept newer provider lookup and encrypted persistence. Added creation-time fiat-price ceiling against the saved quote. Preserved three additional primary-checkout order identity mismatch tests by exact scoped patch; unrelated primary edits were not copied.
- C12 candidate: PostgreSQL transactional claims with `FOR UPDATE SKIP LOCKED`, atomic event/attempt commit, bounded backoff, durable quarantine after eight failures and fixed error categories without payloads. CLI `pnpm run funding:worker`, separately enabled, handles up to 100 items per invocation. Headless events fetch canonical provider status; hosted events validate authenticated provider payloads. Unknown/legacy ambiguous references are retained, not guessed. Worker does not credit funds.
- C13 candidate: ordered provider statuses reject stale/pending regressions, preserve completed status and allow newer failed-to-completed observations. Unique opaque per-attempt provider references identify new hosted/Headless attempts; existing stable legacy references remain protected. Missing checkout links after event recovery return metadata rather than decrypting null. Provider completion remains unverified settlement.
- C16 candidate: authenticated `GET /v1/funding/readiness?tokenId=...` reads live deployment chain/native USDC/6 decimals, listing price/availability, wallet balance, allowance to the actual diamond spender, ETH and wallet code. Funded EOAs get actual purchase gas simulation and a 20% estimate margin; unsupported/unverified customer sponsorship remains an explicit blocker. No approval, signature, purchase or automatic relay is issued. Verified spender path against `MarketplaceFacet.purchaseAsset -> PaymentFacet.distributePaymentFrom -> IERC20.safeTransferFrom(payer,address(this),amount)` in the local contracts source.
- Fixed readiness BigInt test-title serialization and updated actor inventory assertions for three funding write endpoints. The first full run failed only those two stale inventory assertions (2,246 passed, 73 gates); fixed metadata/tests and reran required suites. Focused funding/inventory 150 passed, 21 database gates; `pnpm run test:indexer:postgres` separately passed all 31 checks (21 funding, six indexer, four privacy), migrations applied twice.
- `pnpm exec tsx scripts/proof-funding-readiness-local.ts output/coinbase-usdc/2026-11-04-readiness-local.json`: passed against disposable local Anvil using ABI read fixtures, actual RPC/contract calls and EVM gas estimates. Exact units, one-unit balance shortage, allowance shortage, customer sponsorship unknown and wrong USDC token were exercised. Wallet nonce stayed zero. This is not production marketplace execution, Coinbase sandbox acceptance, fork settlement or C19 proof.
- Frontend discovery: connected projects are api-layer, CONTRACTS, MOLTSTUDIOS, paperclip and poster projects. MOLTSTUDIOS has a web client but no confirmed USpeaks API-layer consumer binding in inspected source/configuration. Requested exact repository/path/access through the user-input tool; no answer yet. F01 remains open. No server key was placed in frontend code and no unrelated frontend project was modified.
- Rechecked current official [Onramp webhook contract](https://docs.cdp.coinbase.com/webhooks/onramp) and [Headless integration](https://docs.cdp.coinbase.com/onramp/headless-onramp/overview). Provider fixtures remain synthetic. C10/C14 polling, subscription health and legacy ambiguity recovery remain open; C15 settlement, C17 approval, C18 purchase and C19/C20 provider/release proofs remain open. Coinbase server credentials/capabilities, frontend source and deployment database/onboarding need actual acceptance; none is inferred from tests.
- Detailed command logs `.runtime/coinbase-20261104-*`; final counts, default push and observed exact-SHA CI status will follow after gates complete. Privacy remains separately accepted per `output/transaction-request-privacy-readiness.json`; write-proof counts remain owned by that automation. Imported October 25 readiness data is historical recovery material and must not override newer delivered evidence.
