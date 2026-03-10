# USpeaks API Layer

Independent API-layer workspace nested inside the contracts repository.

## Overview

- `packages/client`: TypeChain-first client, provider routing, policy metadata, and generated wrappers.
- `packages/rpc`: JSON-RPC action service with API key auth, Redis-backed rate limits, and optional gasless relay support.
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

Create `.env` from the variables consumed by `packages/client/src/runtime/config.ts`.
