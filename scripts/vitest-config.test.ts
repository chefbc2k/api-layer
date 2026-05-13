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

  it("routes the package coverage command through the repo coverage runner", () => {
    expect(config.test?.coverage?.reporter).toBeUndefined();
    expect(packageJson.scripts["test:coverage"]).toBe("tsx scripts/run-test-coverage.ts");
    expect(packageJson.devDependencies["@vitest/coverage-v8"]).toBeDefined();
  });
});
