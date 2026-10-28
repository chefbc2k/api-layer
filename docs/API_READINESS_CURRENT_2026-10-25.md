# API production readiness — October 25, 2026

Not all identified implementation and assurance gaps are complete. The API has complete generated function-route coverage, but production readiness has not been established. There is no agreed weighted release checklist from which an honest single overall percentage can be calculated.

| Measure | Current evidence | Meaning |
| --- | --- | --- |
| Generated ABI function routes | 492/492 (100%) | Interface coverage; checked with `pnpm run coverage:check` during this review |
| Static gap classifier | 710/710 classified ready | 492 functions plus 218 facet event occurrences; static evidence attribution, not production certification |
| Accepted Coinbase funding units | 5/20 (25%) | C01–C05 accepted; remaining units retain their original denominator |
| Exact-method receipt/indexer proof | 109/260 writes (41.9%) | Recorded successful fork receipts, PostgreSQL ingestion and replay evidence; 151 remain |
| Overall production readiness | Not established | Requires functioning funding-to-contract flow and deployment/operational evidence |

The durable write evidence is `verify-local-fork-indexer-output.json`, generated October 25 at 10:59:19 UTC. It records 560 receipts, 864 raw events and 566 projection rows. This updates the October 18 review's 108 proven / 152 remaining counts. The artifact was inspected, not regenerated in this change. A missing proof is an assurance gap and is not itself evidence of a broken function.

## On-ramp work added in this working tree

The intended customer journey remains eligible payment method → Coinbase checkout → USDC in the customer's bound wallet → confirmed chain/token/recipient settlement → bounded allowance approval → fresh marketplace validation → signed contract purchase and receipt/indexer confirmation.

New candidate code adds embedded sandbox order creation, owner-scoped detail and paginated attempt history, durable owner/key request fingerprints and concurrency protection. A reservation is committed before provider contact. Ambiguous outcomes remain blocked across restarts; repeated requests do not recreate orders. Sandbox URLs use Coinbase's documented fake-payment flags. Private verification tokens are omitted from customer responses, and history also omits checkout links. Provider completion always remains `settlementStatus: unverified` and `purchaseReady: false`.

A bound read-only API key could previously reach quote creation; both quote and order creation now enforce write permission. The actor inventory includes the new funding write and its denial checks. Production order creation remains disabled. These changes are local working-tree changes; no deployment, live provider request or payment was executed.

C06/C08/C09/C10 have implementation progress but remain pending acceptance. C10 specifically lacks recovery through provider reconciliation; the candidate only prevents unsafe retries. Lookup exposes the provider status last observed at order creation, not a fresh provider lookup. No additional full baseline unit is counted complete.

## Remaining launch blockers

- Coinbase hosted-account sessions, signed raw-body webhooks, durable inbox, lifecycle transitions and reconciliation worker.
- Exact USDC settlement verification, live wallet balance/allowance/gas checks, bounded approvals and funding-to-purchase handoff.
- Actual provider sandbox execution, matching contract settlement/fork proof, consuming frontend integration and Coinbase embedded/production access.
- 151 exact-method write receipt/indexer proofs, plus deployment-specific persistence, RPC, rate-limit, signing and operational validation.
- Existing `GET /v1/transactions/requests/:requestId` remains unauthenticated and has no owner check in `packages/api/src/app.ts`. This separate private-record gap is still open; the new funding lookups have their own owner checks.
- Explicit indexed execution remains unavailable in `shared/execution-context.ts`; generated definitions do not advertise it.

Card support must be presented according to current provider eligibility. Coinbase's reviewed Headless order API accepts Apple Pay and Google Pay; do not promise unrestricted direct entry of any credit/debit card. Embedded verification requires Coinbase account enablement. See [Headless Onramp](https://docs.cdp.coinbase.com/onramp/headless-onramp/overview).

## Verification

Final verification: 2,587 regression tests passed (62 gated skips); 20 real PostgreSQL checks and 916 actor checks passed separately. Focused funding/inventory checks passed 122/122; TypeScript, lint, workspace builds and generated-surface checks passed. Results and commands are recorded in the October 25 entry of [the build log](./COINBASE_USDC_BUILD_LOG.md). Provider responses in tests are synthetic. Database tests run against disposable real PostgreSQL, with migrations applied twice. No new measured coverage percentage, production approval, deployment, real-money payment or on-chain USDC settlement is claimed.

The machine-readable current assessment is `output/api-readiness-current-2026-10-25.json`. The concrete API and rollback behavior are documented in [the funding API contract](./COINBASE_FUNDING_API.md).
