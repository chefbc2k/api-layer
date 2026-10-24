# Coinbase USDC funding and API readiness review

Reviewed October 18, 2026 against the current working tree, including existing uncommitted changes. This is a research and implementation specification; no fiat integration has been deployed or enabled. “Quiz” is provisionally interpreted as ABI functions, and “WGMI” as Wagmi. A separate quiz/catalog or frontend repository was not supplied.

## Findings

- Fiat-to-USDC funding is missing. The existing Coinbase SDK integration relays a configured smart wallet's transactions; it does not purchase USDC or connect customer payment methods.
- All 492 ABI functions across 33 facets have generated client/RPC/HTTP definitions and corresponding primitive route registrations. There are 232 reads and 260 writes across 13 HTTP domains. No missing primitive function route was found.
- Production readiness is not established for every function. The durable receipt/indexer artifact proves 108/260 writes through receipt, decoding, PostgreSQL ingestion, and replay; 152 writes still lack this complete evidence. Missing evidence does not by itself mean a broken implementation.
- No Wagmi hook package or WGMI route namespace exists in this repository. Its client uses ethers and TypeChain. A frontend call-by-call comparison needs the frontend source/catalog.
- Explicit indexed execution remains unimplemented in `packages/api/src/shared/execution-context.ts`. Current generated HTTP definitions advertise no indexed execution, so this is an unavailable capability rather than an advertised route that silently fails.

## Coinbase product selection

Use Coinbase Onramp to fund each authenticated user's wallet with USDC on Base. Recommend Headless Onramp for US guest payments and Coinbase-hosted Onramp for customers using a Coinbase account. Coinbase's current overview lists June 30, 2026 as the deprecation date for hosted guest checkout; that date has passed. Do not build a new guest-card flow using older hosted-widget tutorials. New integrations begin in trial mode and need Coinbase approval for full production access. [Onramp overview](https://docs.cdp.coinbase.com/onramp/onramp-overview), [product overview](https://docs.cdp.coinbase.com/onramp/introduction/welcome).

The v2 Headless order API currently enumerates Apple Pay and Google Pay payment methods. It does not expose an arbitrary raw debit-card-entry payment method. Hosted Coinbase-account rails can include linked bank methods and balances, subject to eligibility; do not promise a standalone guest ACH flow. Discover eligibility by region and payment method. [Create order reference](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order), [countries and currencies](https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/countries-&-currencies).

Headless currently serves US users. Prefer its embedded order experience, subject to account enablement, so Coinbase collects contact and identity details. If standard Headless is used instead, the platform needs verified email/phone and renewed phone verification every 60 days. Browser embedding requires domain approval/verification and the prescribed iframe configuration. User gesture and terms requirements also apply. These are frontend and Coinbase onboarding dependencies. [Headless integration guide](https://docs.cdp.coinbase.com/onramp/headless-onramp/overview), [verification](https://docs.cdp.coinbase.com/onramp/headless-onramp/verification).

Onramp funds a wallet. A subsequent marketplace purchase is a separate contract transaction. Coinbase Payment Acceptance is another product for merchant payment authorization/capture/refunds; it should not be substituted for this wallet-funding flow. [Payment Acceptance overview](https://docs.cdp.coinbase.com/api-reference/payment-acceptance/overview).

## Existing integration points

| Source | Current behavior | Required addition |
| --- | --- | --- |
| `packages/api/src/shared/cdp-smart-wallet.ts` | Resolves a globally configured smart account and submits user operations; defaults to Base Sepolia | Separate customer identity/wallet binding and funding adapter; never assume this governance wallet belongs to the buyer |
| `packages/api/src/workflows/purchase-marketplace-asset.ts` | Reports externally managed USDC preconditions, with null balance/allowance reads; maps funding/allowance failures to 409 | Actual funding readiness inspection and bounded approval flow |
| `packages/api/src/workflows/marketplace-payment-helpers.ts` | Reads payment token through `getUsdcToken` | Validate configured chain/token against the chosen onramp destination |
| `packages/api/src/app.ts` | Global JSON parser, domain modules and workflows; no funding/webhook mount | Funding module plus a raw-body webhook route mounted before JSON parsing |
| `packages/api/src/shared/tx-store.ts` | Optional PostgreSQL contract transaction persistence | Separate durable fiat/order/settlement records and unique constraints |
| `db/migrations/` | Contract transaction and indexer schema | Funding attempts, provider order mapping, webhook inbox and reconciliation state |

## Proposed API contract — none of these routes exists yet

These are suggested application endpoints, not Coinbase endpoint names. Keep fiat operations outside ABI-generated primitive modules.

| Proposed endpoint | Purpose |
| --- | --- |
| `GET /v1/funding/options` | Region/payment-method/asset/network eligibility; distinguish hosted and Headless support |
| `POST /v1/funding/quotes` | Return exact fiat cost, fees and USDC output without creating a payable order |
| `POST /v1/funding/orders` | Create a Headless order; return the provider payment link and local attempt ID |
| `POST /v1/funding/sessions` | Create a securely initialized hosted Coinbase-account checkout |
| `GET /v1/funding/orders/:id` | Owner-scoped normalized order status and settlement evidence |
| `GET /v1/funding/history` | Owner-scoped funding history with pagination |
| `GET /v1/funding/readiness` | Live USDC balance, spender allowance and gas/sponsorship readiness |
| `POST /v1/funding/approval-requests` | Prepare a bounded USDC approval for an authenticated wallet to sign; support explicit authorized server-wallet signing separately |
| `POST /v1/webhooks/coinbase/onramp` | Verify and durably enqueue provider events |

Add verification initiation/submission endpoints only if using the standard Headless flow. Add an internal scheduled reconciliation worker, not a customer-facing administrative trigger. Offramp/cash-out is a separate follow-up and is not present either.

## Provider requests and authentication

- Headless: `POST https://api.cdp.coinbase.com/platform/v2/onramp/orders`. Pin `purchaseCurrency=USDC` and `destinationNetwork=base` server-side, bind the destination to the authenticated user's wallet, and generate opaque user/order references. Use `isQuote=true` for pricing and a separate payable request when the user continues. Select one amount basis: `purchaseAmount` for a target USDC receipt or `paymentAmount` for a fixed fiat budget; account for returned fees. Do not copy the reference's example containing both amount fields into application validation. [Order API](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order).
- Hosted: `POST https://api.developer.coinbase.com/onramp/v1/token`, then construct the Coinbase-hosted URL. Include the real client IP, destination/address restrictions and asset restrictions. Tokens are single-use and expire after five minutes. [Quickstart](https://docs.cdp.coinbase.com/onramp/introduction/quickstart).
- Sign server requests using a CDP Secret API Key and request-bound JWTs. The SDK's `generateJwt` helper accepts method, host and path, with a default 120-second lifetime. A wallet secret is for sensitive signing operations; do not make it a prerequisite for ordinary onramp HTTP requests. [CDP authentication](https://docs.cdp.coinbase.com/api-reference/v2/authentication).
- Require end-user authentication, approved browser origins, wallet ownership and allowlisted redirects. Obtain client IP only through correctly configured trusted proxies. Never accept client-supplied user references, verification attestations or arbitrary wallet substitutions as authoritative. [Security requirements](https://docs.cdp.coinbase.com/onramp/security-requirements).

Do not assume `partnerOrderRef` provides provider-side idempotency: the reviewed order reference describes it as a reference field. Use a local unique `(user_id, idempotency_key)` plus a request fingerprint and durable attempt record. Resolve ambiguous upstream timeouts through status/history reconciliation before permitting a duplicate payable attempt.

## Settlement and purchase handoff

Recommended application flow:

1. Authenticate the user and bind the exact wallet that will purchase the marketplace asset. For smart accounts, bind the smart-account address as the recipient and purchaser.
2. Read the listing price, actual USDC token and chain. Reject any mismatch between the API deployment and funding destination. Production Base funding must never be offered for a Base Sepolia deployment. Use integer token units and validated decimal strings.
3. Obtain pricing and create the chosen Coinbase experience. Send funds to the user wallet; do not send directly to the diamond contract or treasury without a separately specified deposit/accounting protocol.
4. Persist funding attempts separately from committed financial transactions. Store provider IDs, user/wallet/network, quote amounts, expiry, status and reconciliation cursor; keep secrets and contact information out of logs.
5. Verify provider notifications, fetch status where necessary, and confirm the successful on-chain transfer for the expected chain, token and destination. Record unique settlement identity including chain, transaction hash and log index. A redirect or UI event alone must never credit a balance or trigger a purchase.
6. Re-read the live wallet balance and exact spender allowance. Determine the spender from the actual contract execution path; do not assume protocol-token approvals are USDC approvals. The generated `TokenSupplyFacet.approve` route is not a generic approval of the separately configured USDC token.
7. Obtain explicit user approval for the required USDC allowance and purchase. Budget ETH for an EOA, or configure and verify sponsorship for the user's smart account. The existing globally configured governance relay is insufficient evidence of customer-wallet sponsorship.
8. Execute the existing purchase workflow, wait for its receipt, and reconcile its events/indexer projection. Revalidate listing availability and price after funding; handle cancellation or a sale to another buyer without silently spending funds elsewhere.

Use a provider-status field alongside an application settlement status; preserve pending verification/payment, processing, completed and failed states rather than flattening them into paid/unpaid. A local checkout timeout must remain reconcilable if Coinbase later completes it. [Transaction history API](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-all-onramp-transactions).

Subscribe to all four `onramp.transaction.*` lifecycle events: created, updated, success and failed. Use a durable inbox with event deduplication, quick acknowledgement and an asynchronous worker; handle out-of-order delivery and monitor disabled subscriptions. Normalize hosted and Headless payloads separately. [Onramp webhooks](https://docs.cdp.coinbase.com/webhooks/onramp).

Verify `X-Hook0-Signature` against the unmodified raw request body, signed headers and timestamp, with a timing-safe comparison and replay window. Mount this route before the existing global JSON parser; do not reconstruct JSON for signature verification. [Signature verification](https://docs.cdp.coinbase.com/webhooks/verify-signatures).

## Production audit of the 33 facets

The companion [per-facet and missing-method inventory](./API_READINESS_INVENTORY_2026-10-18.md) lists every facet and all 152 writes missing complete receipt/indexer proof, including their existing HTTP routes. Its [JSON version](../output/api-readiness-review-2026-10-18.json) also inventories all 492 functions.

The existing gap report labels 710/710 items ready: 492 functions plus 218 event occurrences. That classifier checks generated parity and static test attribution. Test names/source references do not establish that a test ran against a deployed contract, and a successful fail-closed admin guard is not proof that the protected command succeeds. Its function-level artifacts contain 146 methods with successful route-execution attribution and 28 with guard-only attribution; these are weaker and different measures than the 108 writes with complete receipt/indexer evidence.

The durable `verify-local-fork-indexer-output.json` artifact dated October 17 records 550 receipts, 845 raw events, 555 projection rows and 108/260 proven writes. Even those successful local-fork proofs are not a blanket production deployment certification. The roadmap explicitly retains the 152-method merge blocker. The actor report still mentions an excluded legacy overload, but current generated sources mount `/v1/governance/admin/legacy-proposals`; treat that exclusion sentence as stale.

218 counts facet event occurrences; the HTTP event registry has 214 entries after registry deduplication. Do not describe these as 218 distinct HTTP event endpoints.

Other production conditions needing explicit deployment evidence include configured PostgreSQL persistence, shared rate limiting for multiple instances, correct signer authorization, chain/token configuration, customer-wallet signing, production RPC reliability and operation-specific economic/post-state assertions. The transaction-request lookup route currently has no authentication or ownership check and returns a stored request record; restrict it before using analogous routes for private funding records. Public chain transaction receipts and private request records have different access requirements.

## Wagmi / WGMI conclusion

No missing ABI primitive endpoint was found, and no literal WGMI API or Wagmi implementation was found. Existing routes can be consumed by a frontend, but this repository cannot prove that frontend hooks exist or that frontend calls match their contracts. A Wagmi adapter, connected-wallet signing/chain switching, funding UI, bounded USDC approval and purchase receipt handoff need implementation or verification in the frontend repository. Wagmi itself does not add fiat rails.

## Delivery sequence and acceptance criteria

1. Confirm Coinbase production access, target markets and embedded-order enablement; choose the wallet/signing model and matching production contract deployment. These are external launch dependencies, not resolved by documentation review.
2. Implement the funding module and database migration, authenticated wallet binding, local idempotency, quotes, Headless orders and hosted-account sessions.
3. Implement raw-body webhook verification, durable inbox, status normalization, settlement verification and reconciliation; then integrate wallet readiness/approval with purchases.
4. Build the frontend payment experience and validate wallet switching, user gesture, allowed origins, redirects and provider-required domain setup.
5. Test duplicate and concurrent requests, ambiguous upstream timeouts, invalid signatures, stale/replayed/out-of-order events, cross-user access, wrong network/token/wallet, failed payments, abandoned/late-completing checkouts, insufficient balance/allowance and changed listings. Headless sandbox uses a `sandbox-` user reference and the documented payment-method sandbox query parameter; it does not deliver real USDC. Run real contract settlement tests separately with disposable test funds. Provider production testing requires a controlled small real-money pilot after onboarding.
6. Close the 152 existing exact-method receipt/indexer evidence gaps on disposable forks, using receipt status, decoded events or eventless state readback, PostgreSQL ingestion and idempotent replay. Update the production decision separately from the generic ready classifier.

Validation performed for this review: wrapper/RPC coverage passed for 492 functions and 218 event occurrences; HTTP coverage passed for 492 methods; a static registration cross-check found zero missing primitive method mounts. The focused API, route, Coinbase relay, purchase, payment command-safety and report suites passed 127/127 tests across six files. No new live RPC, card payment, fiat conversion or production transfer was executed.
