import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
import config from "../vitest.config";

describe("coverage runner configuration", () => {
  it("keeps verification scripts out of coverage accounting", () => {
    expect(config.test?.coverage?.include).toEqual([
      "packages/api/src/**/*.ts",
      "packages/client/src/**/*.ts",
      "packages/indexer/src/**/*.ts",
      "scripts/**/*.ts",
    ]);
    expect(config.test?.coverage?.exclude).toContain("scripts/verify-*.ts");
    expect(config.test?.coverage?.excludeAfterRemap).toBe(true);
  });

  it("drives reporter selection and tempdir creation from the coverage script", () => {
    expect(config.test?.coverage?.reporter).toBeUndefined();
    expect(packageJson.scripts["test:coverage"]).toContain("mkdir -p coverage/.tmp");
    expect(packageJson.scripts["test:coverage"]).toContain("--coverage.reporter=text");
  });
});
