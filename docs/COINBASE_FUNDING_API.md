# Coinbase funding API — pricing foundation

This release implements C01–C05 of the funding backlog. It exposes eligibility and non-payable pricing only. Orders, hosted checkout sessions, webhooks, settlement, approvals and purchases remain separate acceptance units. Funding is disabled by default.

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

## Verification and next steps

Run `pnpm exec vitest run packages/api/src/funding/funding.test.ts --maxWorkers 1` for configuration, actual JWT signing/verification and HTTP boundary checks. `pnpm run test:indexer:postgres` provisions a disposable database, applies all migrations twice, and runs both indexer and funding PostgreSQL integration tests. Required PostgreSQL cases are executed by that runner even though they are gated out of normal no-database test runs.

Coinbase approval, usable CDP credentials, frontend source and controlled provider sandbox execution remain external acceptance dependencies. These tests use synthetic provider responses and disposable database data; they do not claim a completed Coinbase sandbox or real-money transaction.

Provider contracts checked against [Buy Options](https://docs.cdp.coinbase.com/api-reference/rest-api/onramp-offramp/get-buy-options), [Create Onramp Order](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order), and [Circle USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses). Continue with C06–C10: orders, secure hosted sessions, owner-scoped status/history and durable idempotency.
