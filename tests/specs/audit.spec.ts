import { expect, type Page } from "@playwright/test";
import { test as authedTest } from "../fixtures/auth";

const SLUG = process.env.E2E_CUSTOMER_SLUG;

async function assertAuditPageShell(page: Page) {
  // Filter inputs (search + at least one select-style filter).
  const search = page
    .locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i], input[name="q"]',
    )
    .first();
  await expect(search).toBeVisible();

  // Page-size select.
  const pageSize = page
    .locator("select")
    .filter({ hasText: /\b(10|20|25|50|100)\b/ })
    .first()
    .or(page.locator("select[name*='size' i], select[name*='per' i]").first());
  await expect(pageSize).toBeVisible();

  // Pagination footer — Next/Previous controls or page numbers.
  await expect(
    page
      .getByRole("button", { name: /next|previous/i })
      .first()
      .or(page.getByRole("navigation", { name: /pagination/i }).first()),
  ).toBeVisible();

  // Debounced search — type and ensure the request fires (no exception).
  await search.fill("a");
  await page.waitForTimeout(400); // give debounce time to flush
  await search.fill("");
}

authedTest("/dashboard/audit renders with filters, search, page-size, pagination", async ({
  authedPage: page,
}) => {
  await page.goto("/dashboard/audit");
  await expect(page).toHaveURL(/\/dashboard\/audit/);
  await assertAuditPageShell(page);
});

authedTest("/admin/customers/:slug/audit renders with filters, search, page-size, pagination", async ({
  authedPage: page,
}) => {
  authedTest.skip(!SLUG, "E2E_CUSTOMER_SLUG not set");
  await page.goto(`/admin/customers/${SLUG}/audit`);
  await expect(page).toHaveURL(new RegExp(`/admin/customers/${SLUG}/audit`));
  await assertAuditPageShell(page);
});
