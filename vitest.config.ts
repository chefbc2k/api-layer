import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "scripts/**/*.test.ts", "scenario-adapter/**/*.test.ts"],
    coverage: {
      include: [
        "packages/api/src/**/*.ts",
        "packages/client/src/**/*.ts",
        "packages/indexer/src/**/*.ts",
        "scripts/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "generated/**",
        "packages/**/generated/**",
        "packages/client/src/generated/**",
        "packages/**/index.ts",
        "packages/api/src/shared/route-types.ts",
        "scenario-adapter/**",
        "scenario-adapter-overrides/**",
        "ops/**",
        "scripts/check-*.ts",
        "scripts/debug-*.ts",
        "scripts/force-*.ts",
        "scripts/focused-*.ts",
        "scripts/generate-*.ts",
        "scripts/ingest-*.ts",
        "scripts/run-*.ts",
        "scripts/seed-*.ts",
        "scripts/show-validated-baseline.ts",
        "scripts/sync-*.ts",
        "scripts/verify-*.ts",
      ],
      excludeAfterRemap: true,
      reporter: ["text", "json-summary"],
    },
  },
});
