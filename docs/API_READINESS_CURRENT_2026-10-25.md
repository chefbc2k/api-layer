# API production readiness ledger — updated November 4, 2026

Overall production readiness is not established. The historical filename is retained as the shared ledger named by the automations.

| Workstream | Current evidence | Acceptance boundary |
| --- | --- | --- |
| Coinbase backend funding | 13/20 accepted (65%): C01–C09, C11–C13, C16 | Local backend gates and real PostgreSQL/local-EVM proofs; no production checkout or settlement launch |
| Consuming frontend F01 | 0/1; open | Actual USpeaks repository/path/access still unconfirmed; MOLTSTUDIOS is not assumed to be the consumer |
| Transaction-request privacy | Complete per separate owner ledger | See `output/transaction-request-privacy-readiness.json`; deployment still needs migration 0008 |
| Exact-method write proof | Separately owned; baseline reported 109/260, 151 remaining | Checked-in default artifact is older (October 9: 107/260, 153 remaining); reconcile through its owner, not funding attribution |
| Generated route coverage | 492 functions, 218 event occurrences, 260 write invariants | Static/surface assurance is not production certification |

C10/C14 recovery/polling/subscription health, C15 USDC receipt settlement, C17 bounded approvals, C18 signed purchase, C19 real provider/fork acceptance and C20 release acceptance remain open. Backend event processing now persists canonical Headless observations and typed hosted events; late completion and replay ordering are tested. Wallet readiness reads actual chain/token/listing/balance/allowance and EOA gas; customer-specific smart-account sponsorship stays explicitly unverified.

The November 4 batch completed three of eleven starting open funding/frontend items, meeting the rounded-up minimum of three. Eight remain including F01, so the next minimum is two. Preserve the original twenty-unit denominator and track F01 separately. October 26–November 3 interruptions did not earn acceptance; late recovery accounting is in the build log.

CDP server credentials are present; funding and checkout remain disabled. A non-payable actual-provider quote probe returned HTTP 400 with domain-related diagnostics. Approved app domain/capabilities, the actual frontend/client context, webhook subscription secret, deployment PostgreSQL and actual sandbox checkout/settlement acceptance are still required. Synthetic provider fixtures are not Coinbase acceptance, and a UI callback/provider-completed status never proves USDC credit or authorizes purchase.

Verification: 2,262 regression tests passed, 73 live/database gates; all selected database cases separately passed within 31 real PostgreSQL checks. Actor checks 588, red-team 181, indexer 268 plus six separately executed PostgreSQL cases; typecheck, lint, workspace builds, surface checks and measured coverage passed. Actual local-EVM readiness proof used read fixtures with no transfers and is not settlement/fork production evidence. Full commands, failure corrections, source commits and delivery receipt are in `docs/COINBASE_USDC_BUILD_LOG.md` and `output/coinbase-usdc/2026-11-04-verification.json`.

Do not derive a weighted overall production percentage from 710 static classifications, local coverage or sandbox success. Other workstreams own their evidence and acceptance; no new write-proof or privacy completion is claimed by this funding batch.
