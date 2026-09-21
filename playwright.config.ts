import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end suite against a production build (`npm run build` first). It starts `next start`
 * on its own port with a throwaway SQLite database seeded with the demo workspace.
 */
const PORT = Number(process.env.E2E_PORT || 3111);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.ts/ },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: "file:./e2e.db",
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789abcdef",
      SHEAF_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      WORKER_SECRET: "e2e-worker-secret-0123456789abcdef",
      SHEAF_MODE: "demo",
      SHEAF_RATE_LIMIT: "off",
      WORKER_MODE: "in-process",
      WORKER_INTERVAL_MS: "500",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
