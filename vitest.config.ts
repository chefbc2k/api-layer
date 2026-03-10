import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "scripts/**/*.test.ts", "scenario-adapter/**/*.test.ts"],
  },
});

