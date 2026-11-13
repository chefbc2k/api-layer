# Coinbase funding API

The backend implements C01–C18, including pricing, checkout, private status/history, authenticated webhooks, durable processing and recovery, exact settlement, bounded approval preparation and customer-signed purchase handoff. Backend acceptance is 18/20 (90%); C19 actual provider/deployed integration, C20 release acceptance and the separate consuming frontend F01 remain open. Funding and checkout are disabled by default. Provider completion never means verified settlement. See the [current readiness ledger](API_READINESS_CURRENT_2026-10-25.md) for the acceptance boundary.

## Server configuration

Set `API_LAYER_FUNDING_ENABLED=true` only in an explicitly configured environment. Required settings:

| Variable | Meaning |
| --- | --- |
| `API_LAYER_FUNDING_MODE` | `sandbox` (default) or `live` |
| `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` | Server-only CDP REST credentials; a wallet signing secret is not needed for quotes |
| `API_LAYER_FUNDING_ORIGINS_JSON` | JSON array of exact approved HTTPS origins; HTTP localhost is allowed for development |
| `SUPABASE_DB_URL` | PostgreSQL connection for durable quote attempts |

Apply `db/migrations/0005_funding_quotes.sql` after the existing migrations. The backend needs a database role authorized for this table. Public and browser-authenticated roles have no access. The application scopes every quote lookup by its authenticated owner.

Each customer API-key record in `API_LAYER_KEYS_JSON` must have a server-provisioned opaque `fundingUserId` (1–64 alphanumeric, underscore or hyphen characters) and `walletAddress`. A generic service key without this binding cannot use funding endpoints. Route customer requests through the application's trusted backend; never ship server/service API keys or Coinbase credentials to browser bundles. Multiple keys for one customer should use the same stable funding ID.

An optional `x-wallet-address` must match the server binding. Request bodies cannot override the customer ID, wallet, asset or network. Origins are explicitly checked; machine clients can omit Origin but still require customer authentication. Requests are rate-limited by stable funding ID.

The router reads the chain ID and `getUsdcToken()` from the configured diamond using the normal provider router. Live mode requires Base mainnet and Circle's native Base USDC. Sandbox permits Base Sepolia with its native test USDC or Base mainnet; provider pricing still uses the Base product and does not send tokens to either chain. Sandbox quotes must never be interpreted as evidence of wallet funding. Configure trusted-proxy handling explicitly before putting the API behind a proxy; do not blindly trust arbitrary forwarded IP headers.

## Endpoints

`GET /v1/funding/options?country=US&subdivision=IL` requires `x-api-key` and returns the USD/USDC Base eligibility from Coinbase's current Buy Options response. US requests require a subdivision. Hosted-account and Headless payment-method limits are separated; guest card methods from the deprecated hosted flow are not advertised as hosted methods. Headless methods are offered only for US requests and only when present in provider options. No funding result is cached in a public HTTP cache.

`POST /v1/funding/quotes` accepts:

```json
{
  "country": "US",
  "subdivision": "IL",
  "paymentMethod": "GUEST_CHECKOUT_APPLE_PAY",
  "purchaseAmount": "100.000000"
}
```

Choose exactly one of `purchaseAmount` (up to six decimal places of USDC) or `paymentAmount` (up to two decimal places of USD). Payment methods are Apple Pay or Google Pay, gated by provider eligibility. Numeric JSON values, exponents, leading zeros, negative/zero amounts and excess precision are rejected. Values are checked with integer arithmetic, including provider limits and fee/subtotal/total consistency.

The Coinbase adapter always sends `isQuote=true`; it cannot create a payable order. It signs a fresh request-bound JWT with the installed CDP SDK, enforces a timeout, rejects redirects, validates the response and redacts upstream errors. It pins USD, USDC and Base on the server. Returned destination and exact amount must agree with the request. Provider user references are opaque hashes, prefixed `sandbox-` in sandbox mode.

The `201` response contains a local `id`, local `expiresAt`, `sandbox`, validated `quote` pricing with fee details and `payable:false`. A stored pricing attempt is valid locally for 60 seconds and is not a price reservation or a successful payment. Later payable flows must obtain current pricing. Database failure returns `503`; no successful quote response is returned without durable persistence.

## Verification and external acceptance

Run `pnpm exec vitest run packages/api/src/funding/funding.test.ts --maxWorkers 1` for configuration, actual JWT signing/verification and HTTP boundary checks. `pnpm run test:indexer:postgres` provisions a disposable database, applies all migrations twice, and runs both indexer and funding PostgreSQL integration tests. Required PostgreSQL cases are executed by that runner even though they are gated out of normal no-database test runs.

Coinbase approval, usable CDP credentials, frontend source and controlled provider sandbox execution remain external acceptance dependencies. These tests use synthetic provider responses and disposable database data; they do not claim a completed Coinbase sandbox or real-money transaction.

Provider contracts checked against [Buy Options](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options), [Create Onramp Order](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order), and [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses). C01–C18 backend implementation is described below. C19/C20 and F01 still require actual provider, consuming frontend, deployed integration and release evidence; fixtures do not satisfy those items.

## Checkout and webhook batch (October 25)

Apply migrations 0006 and 0007 after 0005. Enable checkout separately with `API_LAYER_FUNDING_CHECKOUT_ENABLED=true`, `API_LAYER_FUNDING_ENCRYPTION_KEY` (canonical base64 encoding of 32 random bytes), and `API_LAYER_FUNDING_REDIRECT_URL` (fixed approved origin). Keep this key in the deployment secret store and preserve it across restarts; key rotation needs a migration/re-encryption plan.

- `POST /v1/funding/orders` accepts only `{ "quoteId": "<owned unexpired quote UUID>" }`. Requires `Idempotency-Key` of 8–128 letters, digits, `_` or `-`. Creates an embedded Headless verification experience; Coinbase collects contact/verification data. Requires Coinbase embedded access/domain approval. The backend does not attest to user agreement or phone verification.
- `POST /v1/funding/sessions` accepts only `{}` and the same idempotency header. Creates a Coinbase-account hosted session with server-fixed wallet, Base USDC, redirect and opaque customer reference. It does not provide a guest bank/card checkout promise.
- A successful create/replay returns local ID, sandbox flag, normalized status, `settlementStatus: "unverified"`, checkout URL and a five-minute local expiry. URLs and reusable provider auth tokens are encrypted using AES-256-GCM bound to owner and attempt. Reusable tokens are never returned. Expired links return 409; an uncertain create returns 202 with `retryCreation:false` and remains locked across restarts. Do not generate new keys to bypass ambiguity. The November 9 reconciliation section describes safe status/history recovery for uniquely referenced attempts; legacy unknown requests without a unique reference remain operational incidents.
- `GET /v1/funding/orders/:id` uses the local attempt UUID. It checks ownership before contacting Coinbase and validates provider ID, recipient, customer reference and asset/network response. `provider_completed` remains distinct from settlement.
- `GET /v1/funding/history?limit=20&cursor=<UUID>` returns owner-only metadata with an opaque next cursor. Limit 1–100. History never exposes checkout links, reusable tokens or ciphertext.

Enable webhook ingestion separately with `API_LAYER_FUNDING_WEBHOOK_ENABLED=true`, `API_LAYER_FUNDING_WEBHOOK_SECRET` from the Coinbase subscription, and PostgreSQL URL. Configure Coinbase to deliver to HTTPS `/v1/webhooks/coinbase/onramp`. The raw route mounts before global JSON parsing, verifies v1 HMAC using signed content-type/event identity headers, checks timestamps within five minutes in both directions, and accepts the current signature header with legacy fallback. Requests over 256 KiB or compressed bodies are rejected. No end-user API key is required; the provider signature authenticates the request.

An event is acknowledged only after its raw bytes and digest are durably stored. Concurrent duplicate deliveries return success without duplicating the inbox row; the same signed event ID with different content/type returns 503 for investigation. Database failure returns 503 so Coinbase can retry. Restrictive database roles keep provider event data private. The November 4 section supplies inbox processing and lifecycle updates. Ingestion alone does not update orders or credit funds. Processing and subscription-health reconciliation are implemented in the November 4/9 sections; deployment, retention operations and actual provider acceptance remain release requirements. No live deployment was enabled in automated acceptance.

Provider references rechecked October 25: [create order](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order), [create session](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-session), and [signature verification](https://docs.cdp.coinbase.com/webhooks/verify-signatures). Order lookup follows the installed CDP SDK's generated `getOnrampOrderById` contract. Provider fixtures are contract tests, not actual Coinbase sandbox acceptance.

## Durable processing and wallet readiness (November 4 verified backend batch)

Apply funding migration `0009_funding_processing.sql` after privacy migration 0008. Continue using the deployed 0006/0007 schemas; the alternate sandbox-order candidate migration was not substituted for them. Set `API_LAYER_FUNDING_WORKER_ENABLED=true` alongside funding configuration and invoke `pnpm run funding:worker` from an internal scheduler. Each invocation processes at most 100 available inbox rows and prints aggregate counts only. It never creates a charge or transfers tokens. Run only one scheduler cadence appropriate for provider throughput; multiple workers coordinate using database row locks.

The worker commits attempt status and event completion together, rolls back on a failure and releases locks on process exit/crash. Retry delays grow from two seconds up to one hour; after eight failures the raw event remains quarantined for operator investigation. Inspect `last_error` categories, `attempts`, `next_attempt_at` and `quarantined_at` privately. After correcting the cause, an operator can explicitly clear quarantine/reset retry scheduling in the private database. Do not delete unknown events or force a new charge. This inbox worker alone is not full reconciliation. The November 9 section adds subscription health and polling; retention operations and unresolved legacy ambiguity remain release/operational requirements.

New checkouts use one opaque provider reference per attempt. Headless event processing fetches the canonical order and checks its ID/reference/recipient/asset/network. Hosted events use authenticated typed transaction data. Older stable per-user references cannot safely recover an unknown hosted attempt and remain unresolved. Completed status cannot regress; stale data is ignored and a newer late completion can supersede failure. Event updates never credit money. An event-recovered order may return `checkoutAvailable:false` because the payment URL cannot be reconstructed safely.

`GET /v1/funding/readiness?tokenId=1` requires the bound customer key and approved origin. It reports exact decimal-string token units, required listing price, balance, allowance, ETH, observed block identity, gas estimate/budget and blockers. It reads at a common block, simulates the actual EOA purchase only when token balance and allowance suffice, and budgets 120% of estimated gas at the current fee ceiling. The spender is the diamond, verified from the actual payment path, and cannot be supplied by clients. Smart accounts return `customer_sponsorship_unverified` until a customer-specific sponsorship path is configured/verified. `purchaseAuthorized:false` and unverified settlement remain explicit even when the EOA is ready for user signing. Readiness can change immediately; the purchase preparation endpoint below revalidates it, and F01 must revalidate immediately before customer signing.

Checkout writes and quote creation now enforce write-capable API authorization in addition to customer/wallet binding. Sandbox Headless links carry the selected Apple Pay/Google Pay sandbox flag, and order creation rejects a price higher than its saved quote rather than returning a stale-price payment link. Do not enable live checkout or infer provider acceptance from fixture tests.

Backend verification accepts C12/C13/C16 at 13/20 total (65%), with F01 separately open. A real non-payable provider quote probe returned HTTP 400 with domain-related diagnostics. CDP credentials are present but app domain/capability acceptance is unverified; checkout/settlement acceptance is still open. No production launch is certified.

## Reconciliation and timeout recovery — November 9

Apply `0010_funding_reconciliation.sql` with the reviewed unpooled migration connection before enabling this feature. Production Neon was already provisioned with migrations through 0009; do not run destructive assurance suites there. `pnpm run test:indexer:postgres` creates disposable databases.

Set `API_LAYER_FUNDING_RECONCILIATION_ENABLED=true` for the internal `pnpm run funding:worker` job (existing funding/worker enablement is also required). Configure `API_LAYER_FUNDING_WEBHOOK_SUBSCRIPTION_ID` as the actual CDP subscription UUID and `API_LAYER_FUNDING_WEBHOOK_URL` as its exact HTTPS `/v1/webhooks/coinbase/onramp` target, without credentials/query/fragment. The worker reads subscription state and required event types; it never edits provider subscriptions. Its final JSON contains aggregate counts and subscription health, with exit 2 when operator action is needed. Polling continues even if webhooks are disabled.

Each invocation handles at most 100 inbox items and 100 due reconciliation steps. Use an internal scheduler cadence with controlled worker concurrency. A step reads a known Headless order or one page of the provider's per-reference transaction status. Cursor/candidates are durable, private and resumed after restart; an incomplete scan cannot resolve a request. References, recipient, Base USDC, USD totals, positive exact token units and saved Headless amount basis must match. Multiple results and identity collisions require investigation; one result does not imply settlement or authorize purchase. No provider creation request is retried by this worker.

An unknown create with a uniquely correlated provider transaction becomes a known local attempt, retaining the original idempotency key/fingerprint. Replays return that same record even without the original payment URL (`checkoutAvailable:false`). Empty results keep the unresolved lock and retry every minute. After 24 hours they raise `provider_visibility_overdue`. Transient failures use exponential backoff capped at one hour, raise operator attention after eight tries and continue recovery attempts. Invalid identity/value, cursor cycles or legacy ambiguity retry conservatively after an hour with a static private error category.

Legacy records with a known provider order ID refresh using that ID, customer reference, wallet and saved value. A legacy unknown create without a unique reference cannot be resolved reliably from a shared user's history. Obtain provider-side confirmation tied to the original local `partnerOrderRef` before any audited operator remediation. Never clear the lock, choose a similarly priced transaction, reuse a different key or infer non-creation from an empty response. Such cases remain unresolved operational incidents; the positive recovery proofs do not count these negative cases as recovered.

Inspect `funding_attempts.reconcile_error`, `reconcile_attempts`, `reconcile_next_at`, and private `funding_subscription_health` for the configured subscription ID. Quarantined inbox items are retained separately. After correcting provider/configuration issues, operators can schedule another scan; partial pagination state must only be reset as part of an audited investigation. Do not alter owner binding, amount basis or idempotency keys. Funding status is still not USDC credit: C15 must verify exact receipt/chain/token/recipient and unique settlement identity, and C17/C18 must obtain explicit approval/purchase authorization.

November 9 AM backend gates accept C10/C14 at 15/20 (75%) total; F01 stays open separately. All 60 disposable database checks and 2,737 regression tests passed. This does not accept unresolved legacy incidents, real provider checkout, chain settlement or production launch. Review/apply migration 0010 to the existing production database before reconciliation enablement.

### Finalized settlement and bounded approval — November 9 PM

Migration `0011_funding_settlement.sql` adds exact expected units, settlement retries and an immutable receipt ledger. Completed provider metadata continues refreshing until settlement verifies. The internal worker opts into read-only receipt verification with `API_LAYER_FUNDING_SETTLEMENT_ENABLED=true`, `CHAIN_ID` 8453/84532 and a functioning `RPC_URL`. It checks actual RPC chain, successful receipt, native USDC, exact destination and integer amount, one matching Transfer, stable receipt block and finalized height/hash. Missing metadata/finality retries; mismatches require attention. No fallback to latest is allowed. `(chain_id, tx_hash, log_index)` can credit only one attempt. Sandbox evidence produces `test_verified`, never production `verified`. Provider completion and checkout callbacks alone remain unverified.

`POST /v1/funding/approval-requests` requires write-authorized authentication and the bound customer wallet. Strict body: `{"tokenId":"1","maximumUsdcUnits":"10000001","authorizeApprovalPreparation":true}`. The API reads a fresh listing/price and native USDC allowance, checks the explicit price cap and approval gas, and returns an unsigned exact-price approval to the configured diamond. A nonzero allowance differing from the price returns only approve-zero; confirm that receipt and prepare again. An already exact allowance returns no transaction. No arbitrary spender/token, unlimited grant, server signing or broadcast is accepted. Smart-account signing needs the verified consuming wallet adapter and remains unavailable here.

The response's 60-second expiry is advisory, since an ERC20 transaction cannot enforce it on-chain. The consuming signer must prepare/revalidate immediately before signing, check returned chain/token/spender/amount and confirm the receipt; this endpoint never authorizes a purchase. C18's separate purchase endpoint below performs fresh ownership/listing validation and requires explicit purchase consent. F01 must implement the actual UI/signing flow.

`API_LAYER_FUNDING_RUN_FORK_PROOF=true pnpm run test:indexer:postgres` executes migration/replay/permissions tests plus native Circle USDC settlement and bounded approval on a disposable Base Sepolia fork. Source RPC is read-only; every signature, impersonation, mint and transfer targets a separately spawned loopback Anvil instance. The native token code is not replaced; only the listing is a fixture. This is not actual Coinbase checkout or a production transfer. Apply reviewed migrations 0010 and 0011 to the existing Neon database through the migration procedure before enabling workers; this batch applies neither to production.

### Funding-to-purchase handoff — November 10 AM

Apply `0012_funding_purchase_requests.sql` after 0011. `POST /v1/funding/purchase-requests` accepts only:

```json
{"fundingAttemptId":"<owned verified attempt UUID>","tokenId":"1","expectedPriceUsdcUnits":"10000001","expectedSeller":"0x...","authorizePurchase":true}
```

The bound customer must have verified funding in the current chain and sandbox/live mode (`test_verified` only in sandbox). A readiness snapshot must show sufficient native USDC, **exact** price allowance, EOA gas and successful purchase simulation. At the same fresh block, the listing must remain active at the explicitly consented price and seller, with the asset held by the diamond in escrow and its original owner matching that seller; both pause states must permit purchase. A final snapshot hash check rejects reorged input. Unverified funding, changed price/ownership, stale reads, insufficient balance/allowance/gas or unsupported smart-account signing produce no prepared transaction.

A successful response persists an owner-scoped intent and returns `requestId`, advisory `expiresAt`, the unsigned `transaction` and signing constraints. The actual consuming wallet must prepare/revalidate immediately before signing. The server never invokes its governance relay, signs or broadcasts a customer purchase. `purchaseAsset(uint256)` binds only the token ID; the deployed contract does not enforce the observed seller or a deadline in calldata. An exact USDC allowance caps available spend, but does not freeze future allowance changes. A listing can change between preparation and mining. The customer signer must enforce the disclosed limits; stronger atomic seller/deadline guarantees require a reviewed contract interface change. Do not present the 60-second advisory expiry as an on-chain deadline.

After the customer submits the transaction, `POST /v1/funding/purchase-requests/:id/receipt` accepts only `{"txHash":"0x..."}`. It checks the persisted owner/wallet and mode, actual sender/target/chain/calldata/value, successful finalized receipt and stable blocks, exact AssetPurchased token/seller/buyer/price, total actual native-USDC debit and receipt-block NFT ownership. The transaction can attach to only one request per chain; replay for that owner/request is safe. No matching-price inference, unrelated signature or UI callback suffices. Late confirmations remain reconcilable and return `late:true`; sandbox returns `test_confirmed`, never a production purchase claim. A failed/mismatched receipt is not recorded as success. Existing generic contract workflows remain separate; these funding endpoints explicitly hand customer signing to F01.

The gated PostgreSQL/fork suite exercises these endpoints over HTTP with actual native Circle USDC and a declared disposable marketplace fixture, including changed-price rejection, private lookup, user signature, real debit, ownership readback and replay. Fixture source/compiled bytecode provenance is checked in under `scripts/fixtures`; source SHA is verified by the proof runner. It is never a production contract deployment. C19 still requires actual Coinbase acceptance and the integrated deployed marketplace/indexer proof; F01 still requires the consuming frontend source and implementation. Local fixture evidence cannot close either item.

### Release inspection and rollback — November 10 PM

`pnpm run funding:release:inspect -- <output.json>` performs an explicit read-only catalog/checksum/grant/unique-identity inspection against `API_LAYER_FUNDING_RELEASE_DB_URL`. It never applies migrations or certifies production launch. See [COINBASE_FUNDING_ROLLOUT.md](COINBASE_FUNDING_ROLLOUT.md) for exact inspection semantics, rollout prerequisites and rollback preserving financial records, encryption, late completions and ambiguous attempts. Current C19/C20/F01 remain open.
