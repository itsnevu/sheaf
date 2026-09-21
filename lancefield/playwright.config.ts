import { defineConfig, devices } from "@playwright/test";

/** End-to-end suite against a production build (`npm run build` first) on its own port and database. */
const PORT = Number(process.env.E2E_PORT || 3211);

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/v1`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_URL: "file:./e2e.db",
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789abcdef",
      RATE_LIMIT: "off",
      SEED_DEMO: "1",
      NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
