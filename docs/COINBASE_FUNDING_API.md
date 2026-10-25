# Coinbase funding API

The pricing foundation implements C01–C05. The next batch adds embedded order creation, Coinbase-account sessions, owner-scoped status/history, and authenticated raw webhook ingestion. Funding and checkout are disabled by default. Recovery, asynchronous event processing, settlement, approvals and purchase handoff remain unfinished; provider completion never means verified settlement.

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

## Checkout and webhook batch (October 25)

Apply migrations 0006 and 0007 after 0005. Enable checkout separately with `API_LAYER_FUNDING_CHECKOUT_ENABLED=true`, `API_LAYER_FUNDING_ENCRYPTION_KEY` (canonical base64 encoding of 32 random bytes), and `API_LAYER_FUNDING_REDIRECT_URL` (fixed approved origin). Keep this key in the deployment secret store and preserve it across restarts; key rotation needs a migration/re-encryption plan.

- `POST /v1/funding/orders` accepts only `{ "quoteId": "<owned unexpired quote UUID>" }`. Requires `Idempotency-Key` of 8–128 letters, digits, `_` or `-`. Creates an embedded Headless verification experience; Coinbase collects contact/verification data. Requires Coinbase embedded access/domain approval. The backend does not attest to user agreement or phone verification.
- `POST /v1/funding/sessions` accepts only `{}` and the same idempotency header. Creates a Coinbase-account hosted session with server-fixed wallet, Base USDC, redirect and opaque customer reference. It does not provide a guest bank/card checkout promise.
- A successful create/replay returns local ID, sandbox flag, normalized status, `settlementStatus: "unverified"`, checkout URL and a five-minute local expiry. URLs and reusable provider auth tokens are encrypted using AES-256-GCM bound to owner and attempt. Reusable tokens are never returned. Expired links return 409; an uncertain create returns 202 with `retryCreation:false` and remains locked across restarts. Do not generate new keys to bypass ambiguity. Automatic provider-side ambiguity recovery is still pending (C10/C14).
- `GET /v1/funding/orders/:id` uses the local attempt UUID. It checks ownership before contacting Coinbase and validates provider ID, recipient, customer reference and asset/network response. `provider_completed` remains distinct from settlement.
- `GET /v1/funding/history?limit=20&cursor=<UUID>` returns owner-only metadata with an opaque next cursor. Limit 1–100. History never exposes checkout links, reusable tokens or ciphertext.

Enable webhook ingestion separately with `API_LAYER_FUNDING_WEBHOOK_ENABLED=true`, `API_LAYER_FUNDING_WEBHOOK_SECRET` from the Coinbase subscription, and PostgreSQL URL. Configure Coinbase to deliver to HTTPS `/v1/webhooks/coinbase/onramp`. The raw route mounts before global JSON parsing, verifies v1 HMAC using signed content-type/event identity headers, checks timestamps within five minutes in both directions, and accepts the current signature header with legacy fallback. Requests over 256 KiB or compressed bodies are rejected. No end-user API key is required; the provider signature authenticates the request.

An event is acknowledged only after its raw bytes and digest are durably stored. Concurrent duplicate deliveries return success without duplicating the inbox row; the same signed event ID with different content/type returns 503 for investigation. Database failure returns 503 so Coinbase can retry. Restrictive database roles keep provider event data private. Inbox processing, retention, event transitions, subscription health and reconciliation are still pending C12–C14; enabling ingestion alone does not update orders or credit funds. No live deployment was enabled in automated acceptance.

Provider references rechecked October 25: [create order](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-order), [create session](https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-session), and [signature verification](https://docs.cdp.coinbase.com/webhooks/verify-signatures). Order lookup follows the installed CDP SDK's generated `getOnrampOrderById` contract. Provider fixtures are contract tests, not actual Coinbase sandbox acceptance.
