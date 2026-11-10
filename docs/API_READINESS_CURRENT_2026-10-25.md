# API production readiness ledger — updated November 9, 2026 (PM)

Overall production readiness is not established. The historical filename is retained as the shared ledger named by the automations.

| Workstream | Current evidence | Acceptance boundary |
| --- | --- | --- |
| Coinbase backend funding | 17/20 accepted (85%): C01–C17 | Local backend gates and real PostgreSQL/local-EVM proofs; no production checkout or settlement launch |
| Consuming frontend F01 | 0/1; open | Actual USpeaks repository/path/access still unconfirmed; MOLTSTUDIOS is not assumed to be the consumer |
| Transaction-request privacy | Complete per separate owner ledger | See `output/transaction-request-privacy-readiness.json`; deployment still needs migration 0008 |
| Exact-method write proof | Separately owned; baseline reported 113/260, 147 remaining | Checked-in default artifact is older (October 9: 107/260, 153 remaining); reconcile through its owner, not funding attribution |
| Generated route coverage | 492 functions, 218 event occurrences, 260 write invariants | Static/surface assurance is not production certification |

C18 explicit purchase, C19 actual provider/fork acceptance and C20 release acceptance remain open, alongside F01. Finalized native USDC receipt verification now records one unique chain/transaction/log identity with exact amount and destination. Sandbox is `test_verified`, never production verification. Bounded approval preparation requires explicit consent/cap and customer signature; confirm zero before preparing a differing nonzero allowance again. Smart-account signing remains dependent on its actual wallet adapter.

The November 9 PM batch completed C15/C17: two of six starting open items, meeting the rounded-up minimum two. Backend is 17/20 (85%); four total items remain including F01, so next minimum is one. Preserve the original twenty-unit denominator and separate frontend item. C18 must freshly validate listing/ownership/price and obtain explicit purchase authorization. No approval response or checkout callback authorizes purchase.

CDP server credentials are present; funding and checkout remain disabled. A non-payable actual-provider quote probe returned HTTP 400 with domain-related diagnostics. Approved app domain/capabilities, the actual frontend/client context, webhook subscription secret, migrations 0010/0011 rollout to the existing Neon database and actual sandbox checkout/settlement acceptance are still required. Synthetic provider fixtures are not Coinbase acceptance, and a UI callback/provider-completed status never proves USDC credit or authorizes purchase.

Verification: 2,759 regression tests passed, 108 environment gates. All 66 PostgreSQL/funding-fork cases actually passed separately, including native Circle USDC receipt settlement and local customer approval signatures; native USDC code was not replaced, listing source is a fixture. Actor checks 1,019, red-team 254, indexer 272 plus six separately executed database cases; TypeScript/lint/build/surface checks passed. Coverage: 93.92% statements, 91.79% branches, 96.66% functions, 94.47% lines. The remaining 42 live/fork gates do not certify provider/purchase/release acceptance. Full evidence is in the build log and `output/coinbase-usdc/2026-11-09-pm-verification.json`. Production Neon was provisioned November 8 through migration 0009; 0010/0011 were tested locally and remain rollout actions. No production monetary action or feature enablement occurred.

Do not derive a weighted overall production percentage from 710 static classifications, local coverage or sandbox success. Other workstreams own their evidence and acceptance; no new write-proof or privacy completion is claimed by this funding batch.
