import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: [
      "src/app/onizleme/ana-sayfa-yeni/history-art/2026/data/*.ts",
      "src/components/content/about-hero-data/*.ts",
    ],
    rules: {
      // These modules are generated binary data chunks; naming their default
      // string exports adds no signal and would rewrite large static payloads.
      "import/no-anonymous-default-export": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".local-backups/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off database repair script intentionally uses CommonJS.
    "ilkoku-repair-editor-workflow.cjs",
  ]),
]);

export default eslintConfig;