import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the WCN cloud console E2E smoke tests.
 *
 * Tests rely on a running Next.js dev server on port 3000. The webServer
 * block boots `npm run dev` automatically (or reuses one already running
 * locally; in CI we always spin up a fresh one).
 *
 * Per-spec env vars (see tests/README.md) — specs skip cleanly when missing:
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD   admin login for the auth fixture
 *   E2E_CUSTOMER_SLUG                       a real customer slug for detail/audit specs
 *   E2E_JOB_ID                              a real provisioning job id for the log spec
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: "http://localhost:3000",
    actionTimeout: 10000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
