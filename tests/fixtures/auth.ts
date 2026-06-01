import { test as base, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Auth fixture: performs a real UI login flow once per worker, then reuses
 * the resulting storage state (cookies + localStorage) for subsequent specs.
 *
 * If E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD aren't set, tests using this
 * fixture call `test.skip(...)` rather than failing.
 */

const STORAGE_DIR = path.join(process.cwd(), "tests", ".auth");
const STORAGE_PATH = path.join(STORAGE_DIR, "admin.json");

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

export function adminCredsAvailable(): boolean {
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
}

async function performUiLogin(page: Page): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("performUiLogin called without credentials");
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    }),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

async function ensureStorageState(): Promise<string | undefined> {
  if (!adminCredsAvailable()) return undefined;
  if (fs.existsSync(STORAGE_PATH)) {
    const age = Date.now() - fs.statSync(STORAGE_PATH).mtimeMs;
    // Reuse for up to 30 minutes within a single test run.
    if (age < 30 * 60 * 1000) return STORAGE_PATH;
  }
  return undefined;
}

export const test = base.extend<{
  authedPage: Page;
}>({
  authedPage: async ({ browser }, use, testInfo) => {
    if (!adminCredsAvailable()) {
      testInfo.skip(true, "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD not set");
      // Unreachable, but satisfies the typechecker.
      await use(undefined as unknown as Page);
      return;
    }

    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    const cached = await ensureStorageState();

    let storageState: string | undefined = cached;
    if (!storageState) {
      const setupCtx = await browser.newContext();
      const setupPage = await setupCtx.newPage();
      await performUiLogin(setupPage);
      await setupCtx.storageState({ path: STORAGE_PATH });
      await setupCtx.close();
      storageState = STORAGE_PATH;
    }

    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
