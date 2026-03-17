# USpeaks API Layer

Independent API-layer workspace nested inside the contracts repository.

## Overview

- `packages/client`: TypeChain-first client, provider routing, policy metadata, and generated wrappers.
- `packages/api`: versioned HTTP API, domain modules, workflow routes, auth, rate limits, and contract execution context.
- `packages/indexer`: Base event ingestion, Supabase/Postgres projection pipeline, and reorg handling.
- `db`: Supabase/Postgres migrations, RLS policies, and GraphQL-first schema artifacts.
- `scenario-adapter`: API-mode shims plus a copied local snapshot of the full contracts deployment-scenario suite.
- `ops`: Local orchestration and health tooling.

## Quick Start

```bash
pnpm install
pnpm run sync:scenarios
pnpm run codegen
pnpm run build
```

## Environment

The API runtime reads the repo [`.env`](/Users/chef/Public/api-layer/.env) directly. The deployed proof path is bound to the values already verified there:

- `DIAMOND_ADDRESS`
- `RPC_URL`
- `ALCHEMY_RPC_URL`
- `ALCHEMY_API_KEY`
- `CHAIN_ID`
- `NETWORK`
- `PRIVATE_KEY`
- `ORACLE_WALLET_PRIVATE_KEY`
- `API_LAYER_KEYS_JSON`
- `API_LAYER_SIGNER_MAP_JSON`

For Base Sepolia proof runs, use the repo `.env` instead of hand-pointing the test harness:

```bash
pnpm run baseline:show
pnpm run setup:base-sepolia
pnpm run test:contract:base-sepolia
```

Those commands read the repo `.env`, verify the configured chain id from the live RPC, and fail loudly if the repo config is incomplete.

## Base Sepolia Semantics

Licensing is split into two lifecycles:

- Template lifecycle: `createTemplate -> updateTemplate/setTemplateStatus -> createLicenseFromTemplate`
  This derives voice-specific terms and does not create a caller-scoped active license.
- Active license lifecycle: `issueLicense` or `createLicense`
  This creates the caller-scoped license that powers `get-license-terms`, `record-licensed-usage`, and `transfer-license`.

Caller-scoped licensing reads and actions must use the licensee actor, not a generic read/admin actor.

Governance workflows are also split by live chain timing:

- `POST /v1/workflows/submit-proposal`
- `POST /v1/workflows/vote-on-proposal`

The API no longer treats proposal submission and voting as a single happy-path workflow because the live Base Sepolia governance baseline enforces a non-zero voting delay.

`pnpm run setup:base-sepolia` writes a best-effort fixture report to [`.runtime/base-sepolia-operator-fixtures.json`](/Users/chef/Public/api-layer/.runtime/base-sepolia-operator-fixtures.json). That setup pack uses the repo `.env` signers to inspect and prepare:

- buyer funding and USDC allowance
- licensee/transferee actors
- aged marketplace listing fixtures
- proposer role and voting-power state

It reports which fixtures are actually ready, which are partial, and which still require upstream contract state or additional testnet funding.

## Commercialization Ownership Rule

Business rule: a voice asset can only be commercialized by the current on-chain owner of that asset.

Not sufficient on their own:
- collaborator role
- marketplace seller role
- per-voice authorization
- template access
- approval-style setup without ownership

Commercialization includes:
- dataset packaging using the asset
- listing the resulting dataset/asset for sale
- collaborator-driven commercialization wrappers

UI precondition copy:
- Only the current asset owner can commercialize this asset.
- This account is authorized, but not the owner.
- Transfer ownership first if this collaborator should commercialize.

Validation guidance:
- Fail early in the workflow/UI when the acting user is not the owner.
- Suggested error shape: "commercialization requires current asset ownership; actor is authorized but not owner; transfer asset ownership before commercialization".

## Scenario Adapter

`scenario:api` no longer falls back to local Anvil happy paths. You must supply an explicit scenario command:

```bash
API_LAYER_SCENARIO_COMMAND="node scenario-adapter/trace_access_bootstrap_invariants.js" pnpm run scenario:api
```

To bind that command to the validated Base Sepolia deployment baseline:

```bash
API_LAYER_SCENARIO_COMMAND="node scenario-adapter/trace_access_bootstrap_invariants.js" pnpm run scenario:api:base-sepolia
```

If a scenario uses multiple contract-signing actors, map signer addresses to API keys with `API_LAYER_SIGNER_API_KEYS_JSON` so API-mode calls preserve caller identity instead of collapsing to one global key.
