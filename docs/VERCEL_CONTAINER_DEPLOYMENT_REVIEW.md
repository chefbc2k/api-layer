# Vercel container deployment review

Reviewed October 18, 2026.

Vercel supports deploying this Express HTTP API as a Docker image. Its Container Runtime is in beta on all plans. A single API project can use a root `Dockerfile.vercel` or `Containerfile.vercel`; Vercel detects it, builds the image, pushes it to its registry, and routes HTTP traffic to it. Deployment can be triggered by a connected Git repository, so ongoing deployment can run through the web dashboard and Git integration. [Container Runtime](https://vercel.com/docs/functions/runtimes/container).

This runtime scales idle HTTP instances down and applies Vercel Functions limits. It is not an always-running VM. The indexer needs its own continuous worker deployment. Vercel also documents Daemons for that workload, in public beta; they currently run only in production deployments. [Daemons](https://vercel.com/docs/daemons).

For this repository, the immediate packaging work is:

1. Add the Docker build and an explicit production start command. The current compiled API entrypoint exists at `dist/api/packages/api/src/index.js`; verify all runtime imports in the final image.
2. Make the clean build self-contained. Generated ABIs/manifests/TypeChain files and the pnpm lockfile are currently ignored by Git. Verify code generation and deployment-manifest resolution inside a fresh build rather than relying on this workstation's generated files or sibling contracts checkout.
3. Align the listener with the platform port. The API currently reads `API_LAYER_PORT` and defaults to 8787. Vercel's container runtime defaults to port 80 and supports a project `PORT` setting. Configure matching values or add standard `PORT` support.
4. Inject runtime RPC, chain, diamond, API-auth and signer settings through project environment variables. Use the intended PostgreSQL and shared-rate-limit services. Keep local `.env` files and secrets out of the image/build context.
5. Deploy a preview and verify startup, `/v1/system/health`, authenticated reads and frontend connectivity before promoting the intended deployment.

Multiple services are optional for this single API. If needed later, the current `services` configuration supports `runtime: "container"` with top-level public rewrites. [Services](https://vercel.com/docs/services).

Account inspection reached the Vercel login page in the web client. No account/project settings, paid resource provisioning, environment values or deployment were changed. Platform support is verified from current official documentation; account-specific deployment remains unverified.

This hosting task is separate from completing fiat rails and from proving all contract writes end to end. Those workstreams do not require an infrastructure redesign to make the API reachable for controlled integration testing.
