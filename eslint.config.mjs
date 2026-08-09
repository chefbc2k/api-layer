import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "coverage/**",
      "dist/**",
      "generated/**",
      "output/**",
      ".tmp/**",
      "packages/client/src/generated/**",
      "packages/*/dist/**",
      "scenario-adapter/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{cjs,js,mjs,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-assignment": "off",
      "prefer-const": "off",
      "preserve-caught-error": "off",
    },
  },
);
