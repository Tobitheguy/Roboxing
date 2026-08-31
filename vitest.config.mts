import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Loaded before any test file, so every worker sees the same environment
    // regardless of scheduling. See vitest.setup.ts.
    setupFiles: ["./vitest.setup.ts"],
  },
});
