import { test, expect } from "../fixtures/auth";

const SLUG = process.env.E2E_CUSTOMER_SLUG;
const JOB_ID = process.env.E2E_JOB_ID;

test.describe("provisioning job log", () => {
  test.skip(!SLUG || !JOB_ID, "E2E_CUSTOMER_SLUG / E2E_JOB_ID not set");

  test("renders phase checklist, copy/download/search controls, job-id chip and slug link", async ({
    authedPage: page,
  }) => {
    await page.goto(`/admin/customers/${SLUG}/jobs/${JOB_ID}`);
    await expect(page).toHaveURL(new RegExp(`/admin/customers/${SLUG}/jobs/${JOB_ID}`));

    // Phase checklist — list of provisioning phase items.
    await expect(
      page
        .getByText(/phase|checklist|provision|create|configure/i)
        .first(),
    ).toBeVisible();

    // Copy + download buttons.
    await expect(page.getByRole("button", { name: /copy/i }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /download/i }).or(
        page.getByRole("link", { name: /download/i }),
      ).first(),
    ).toBeVisible();

    // Search box for log.
    await expect(
      page
        .locator(
          'input[type="search"], input[placeholder*="search" i], input[placeholder*="filter" i]',
        )
        .first(),
    ).toBeVisible();

    // Job-id chip showing a truncated UUID (first 8 chars of the job id).
    const shortId = JOB_ID!.slice(0, 8);
    await expect(page.getByText(new RegExp(shortId, "i")).first()).toBeVisible();

    // Slug link in eyebrow.
    const slugLink = page
      .locator(`a[href='/admin/customers/${SLUG}'], a[href*='/admin/customers/${SLUG}']`)
      .first();
    await expect(slugLink).toBeVisible();
    await expect(slugLink).toHaveAttribute("href", new RegExp(`/admin/customers/${SLUG}`));
  });
});
