# API production readiness ledger — updated November 10, 2026 (AM)

Overall production readiness is not established. The historical filename is retained as the shared ledger named by the automations.

| Workstream | Current evidence | Acceptance boundary |
| --- | --- | --- |
| Coinbase backend funding | 18/20 accepted (90%): C01–C18 | Local backend gates and real PostgreSQL/local-EVM proofs; no production checkout or settlement launch |
| Consuming frontend F01 | 0/1; open | Actual USpeaks repository/path/access still unconfirmed; MOLTSTUDIOS is not assumed to be the consumer |
| Transaction-request privacy | Complete per separate owner ledger | See `output/transaction-request-privacy-readiness.json`; deployment still needs migration 0008 |
| Exact-method write proof | Separately owned; baseline reported 113/260, 147 remaining | Checked-in default artifact is older (October 9: 107/260, 153 remaining); reconcile through its owner, not funding attribution |
| Generated route coverage | 492 functions, 218 event occurrences, 260 write invariants | Static/surface assurance is not production certification |

C19 actual provider/deployed marketplace/indexer acceptance and C20 release acceptance remain open, alongside F01. The November 10 AM batch completes C18's backend funding-to-purchase handoff: verified customer funding, explicit token/seller/exact-price consent, fresh listing/escrow ownership and gas/simulation, unsigned customer transaction, private durable intent and finalized signed receipt/native USDC debit/NFT ownership confirmation. Sandbox remains `test_confirmed`, never production completion. Actual UI signing is F01; the globally configured governance relay is never substituted.

One of four starting open items completed, meeting the rounded minimum one. Backend is 18/20 (90%); three total items remain including F01, so next minimum is one. Preserve the original twenty-unit denominator. The contract exposes `purchaseAsset(tokenId)` only: seller/deadline checks are pre-signing observations, expiry advisory, exact allowance a cap only while unchanged. The consuming signer must revalidate; stronger atomic seller/deadline guarantees require a reviewed contract interface. Local fixture evidence does not certify the actual provider or deployed marketplace/indexer pipeline.

CDP server credentials are present; funding and checkout remain disabled. A non-payable actual-provider quote probe returned HTTP 400 with domain-related diagnostics. Approved app domain/capabilities, the actual frontend/client context, webhook subscription secret, migrations 0010–0012 rollout to the existing Neon database and actual sandbox checkout/settlement acceptance are still required. Synthetic provider fixtures are not Coinbase acceptance, and a UI callback/provider-completed status never proves USDC credit or authorizes purchase.

Verification: 2,774 regression tests passed, 111 environment gates. All 69 PostgreSQL/funding-fork cases separately passed, including native Circle USDC and actual customer-signed HTTP purchase against a declared marketplace fixture. The native token was not replaced. Actor checks 1,034, red-team 269, indexer 272 plus six separately executed database cases; TypeScript/lint/build/surface gates passed. Coverage: 93.44% statements, 91.43% branches, 96.50% functions, 94.14% lines. Remaining 42 live/fork gates are not provider/release proof. Commands and evidence: build log and `output/coinbase-usdc/2026-11-10-am-verification.json`. Production Neon remains provisioned through migration 0009; 0010–0012 are reviewed rollout actions, not applied by this batch. No production migration, enablement, charge or transfer occurred.

Do not derive a weighted overall production percentage from 710 static classifications, local coverage or sandbox success. Other workstreams own their evidence and acceptance; no new write-proof or privacy completion is claimed by this funding batch.
