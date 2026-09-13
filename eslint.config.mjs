import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Design handoffs from Claude Design. Vendored prototype bundles — not our
    // code, not in the build, and they trip rules (ReactDOM.render, assigning
    // to `module`) that say nothing about this codebase.
    "design_handoff*/**",
  ]),
]);

export default eslintConfig;
