# Vercel API deployment

This repository deploys to the existing `api-layer` project in `brandons-projects-890ec0a0`. `app.ts` directly imports Express so Vercel can detect the entrypoint, and mounts the same API factory used by the CLI without opening its own listener. The root Express dependency uses the already-locked 5.2.1 version; other dependency snapshots are preserved. Vercel handles HTTP invocation and routes; the API retains its raw webhook ordering, authentication, private request ownership checks and existing endpoints.

`vercel.json` selects the Express framework, uses the frozen pnpm lockfile and runs the normal build with the same `reviewed/ci-deployment-selectors.json` pinned contract inventory as CI. The root TypeScript solution inherits ES2022 runtime settings and disables declaration emission for function compilation. `pnpm run typecheck:vercel` checks the actual entrypoint import graph and is also a CI gate. The generated ABI/client/manifests are build artifacts, not a substitute for real contract acceptance. `.vercelignore` excludes local environment files, dependencies, runtime state and old compiled output. Deploy from a clean checkout of the intended committed source.

## Preview deployment

Link the checkout to the existing project and deploy:

```sh
vercel link --yes --project api-layer --scope brandons-projects-890ec0a0
vercel deploy --yes --scope brandons-projects-890ec0a0 \
  --env API_LAYER_ALLOW_LIVE_ADMIN_WRITES=false \
  --env API_LAYER_FUNDING_ENABLED=false \
  --env API_LAYER_FUNDING_CHECKOUT_ENABLED=false \
  --env API_LAYER_FUNDING_WEBHOOK_ENABLED=false
```

The link command can download a private `.env.local`; do not commit, print or upload it. Use the existing Preview configuration for RPC, chain, diamond and API-key records. The API runtime requires nonempty `RPC_URL` (or `CBDP_RPC_URL`), `ALCHEMY_RPC_URL` (falls back to execution RPC), and `DIAMOND_ADDRESS`; configure credentials only through Vercel's secret environment settings. The deployment overrides keep funding/checkout/webhooks and live admin writes off; they do not enable a production release or apply database migrations.

Read Vercel deployment/build status using `vercel inspect <deployment-url> --scope brandons-projects-890ec0a0`. This verifies Vercel's build state; it is not a claim that a live chain transaction or provider/settlement acceptance ran. The local entrypoint regression proves import does not start a listener, the health route works, and private transaction requests still require authentication.

## Runtime and scheduling scope

This is the HTTP API deployment. Importing the app does not start the separate indexer or funding-worker CLI processes. No Vercel cron schedules are introduced. Codex automation settings and paused Paperclip workers were already applied to their own schedulers; exporting their configuration into Git does not turn them into Vercel schedules. Only the API-layer repository is deployed.

The production project/runtime and backend provider/deployed acceptance remain distinct from Preview build readiness. Follow the existing funding and operations rollout documents for actual schema, credentials, gates and authorized production release. Excluded frontend and Paperclip/company work is not added to this deployment.

Official reference: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
