import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/setup/global.ts"],
    setupFiles: ["tests/setup/env.ts"],
    // Database tests share one SQLite file; run files sequentially to keep them deterministic.
    fileParallelism: false,
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Server-only modules are fine to import under Node in tests.
      "server-only": path.resolve(__dirname, "tests/setup/server-only.ts"),
    },
  },
});
