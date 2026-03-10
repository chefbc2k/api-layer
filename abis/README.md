# API ABI Inventory

This directory is the API-facing ABI source for the current contracts workspace.

## Layout

- `subsystems/`
  Bundled ABI surfaces copied from `artifacts/release-readiness/subsystem-abis/`. These are the broad contract groups already used in release-readiness validation.
- `facets/`
  Facet-specific ABI arrays extracted from Foundry `out/` artifacts. Use these when the API layer needs a narrower, contract-level interface.

## Source Policy

- Subsystem bundles are copied from the release-readiness ABI artifacts so the API layer can consume the same grouped surfaces used during validation.
- Facet ABI files are extracted from the current compiled artifacts under `out/`.
- This directory should stay free of live deployment addresses. Resolve addresses from environment or deployment config at runtime instead of hardcoding them into API assets.
