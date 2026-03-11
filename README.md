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
pnpm run test:contract:base-sepolia
```

Those commands read the repo `.env`, verify the configured chain id from the live RPC, and fail loudly if the repo config is incomplete.

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
