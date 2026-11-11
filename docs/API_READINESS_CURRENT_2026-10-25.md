# API production readiness ledger — updated November 10, 2026 (PM)

Overall production readiness is not established. The historical filename is retained as the shared ledger named by the automations.

| Workstream | Current evidence | Acceptance boundary |
| --- | --- | --- |
| Coinbase backend funding | 18/20 accepted (90%): C01–C18 | Local backend gates and real PostgreSQL/local-EVM proofs; no production checkout or settlement launch |
| Consuming frontend F01 | 0/1; open | Actual USpeaks repository/path/access still unconfirmed; MOLTSTUDIOS is not assumed to be the consumer |
| Transaction-request privacy | Complete per separate owner ledger | See `output/transaction-request-privacy-readiness.json`; deployment still needs migration 0008 |
| Exact-method write proof | Separately owned; baseline reported 113/260, 147 remaining | Checked-in default artifact is older (October 9: 107/260, 153 remaining); reconcile through its owner, not funding attribution |
| Generated route coverage | 492 functions, 218 event occurrences, 260 write invariants | Static/surface assurance is not production certification |

C19 actual provider/deployed marketplace/indexer acceptance and C20 release acceptance remain open, alongside F01. The November 10 AM batch completes C18's backend funding-to-purchase handoff: verified customer funding, explicit token/seller/exact-price consent, fresh listing/escrow ownership and gas/simulation, unsigned customer transaction, private durable intent and finalized signed receipt/native USDC debit/NFT ownership confirmation. Sandbox remains `test_confirmed`, never production completion. Actual UI signing is F01; the globally configured governance relay is never substituted.

The November 10 PM run started with three open items and minimum one; C20 was attempted and zero whole items completed. Backend stays 18/20 (90%); shortfall one is recorded, not credited for partial work. Added a tested read-only migration/checksum/RLS/grant/identity inspector and concrete rollout/rollback runbook. Actual production inspection confirms missing migrations 0010–0012 and their three tables; existing recorded hashes/inspected permissions match. No database write occurred. See `output/coinbase-usdc/2026-11-10-pm-database-inspection.json` and `docs/COINBASE_FUNDING_ROLLOUT.md`.

The contract exposes `purchaseAsset(tokenId)` only: seller/deadline checks are pre-signing observations, expiry advisory, exact allowance a cap only while unchanged. The consuming signer must revalidate; stronger atomic seller/deadline guarantees require a reviewed contract interface. Local fixture evidence does not certify the actual provider or deployed marketplace/indexer pipeline.

Local CDP server credentials are present; the production environment export did not supply CDP/subscription configuration to the inspector. funding and checkout remain disabled. A non-payable actual-provider quote probe returned HTTP 400 with domain-related diagnostics. Approved app domain/capabilities, the actual frontend/client context, webhook subscription secret, migrations 0010–0012 rollout to the existing Neon database and actual sandbox checkout/settlement acceptance are still required. Synthetic provider fixtures are not Coinbase acceptance, and a UI callback/provider-completed status never proves USDC credit or authorizes purchase.

Verification: 2,777 regression tests passed, 114 environment gates. All 72 PostgreSQL/funding-fork cases separately passed, including three new actual database inspection/drift cases; remaining 42 live/fork gates are not release evidence. Actor 1,034, red-team 269, indexer 272 plus six separately executed database cases; final TypeScript/lint/build/surface gates passed. Coverage: 92.79% statements, 90.99% branches, 96.15% functions, 93.62% lines. Actual database inspection was read-only and incomplete, not a launch pass. Commands/evidence: build log and `output/coinbase-usdc/2026-11-10-pm-verification.json`. Production Neon is provisioned through migration 0009; 0010–0012 remain rollout actions. No production monetary write, migration, enablement or deployment occurred. Build/test CI is still unconfigured (only managed Copilot/Dependabot jobs).

Do not derive a weighted overall production percentage from 710 static classifications, local coverage or sandbox success. Other workstreams own their evidence and acceptance; no new write-proof or privacy completion is claimed by this funding batch.
