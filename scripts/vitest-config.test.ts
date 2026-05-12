import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
import config from "../vitest.config";

describe("coverage runner configuration", () => {
  it("keeps verification scripts out of coverage accounting", () => {
    expect(config.test?.coverage?.provider).toBe("custom");
    expect(config.test?.coverage?.customProviderModule).toBe("./scripts/custom-coverage-provider.ts");
    expect(config.test?.coverage?.clean).toBe(false);
    expect(config.test?.coverage?.include).toEqual([
      "packages/api/src/**/*.ts",
      "packages/client/src/**/*.ts",
      "packages/indexer/src/**/*.ts",
      "scripts/**/*.ts",
    ]);
    expect(config.test?.coverage?.exclude).toContain("scripts/verify-*.ts");
    expect(config.test?.coverage?.excludeAfterRemap).toBe(true);
  });

  it("keeps the package coverage command pinned to the stable v8 path", () => {
    expect(config.test?.coverage?.reporter).toBeUndefined();
    expect(packageJson.scripts["test:coverage"]).toContain("--coverage.provider=v8");
    expect(packageJson.scripts["test:coverage"]).toContain("API_LAYER_RUN_CONTRACT_INTEGRATION=0");
    expect(packageJson.devDependencies["@vitest/coverage-v8"]).toBeDefined();
  });
});
