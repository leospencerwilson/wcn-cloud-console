import { test, expect } from "../fixtures/auth";

test.describe("admin home", () => {
  test("renders, with audit table and the three stat tiles", async ({ authedPage: page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin(\/|$|\?)/);

    // Some heading should be present at the top of the admin shell.
    await expect(page.getByRole("heading").first()).toBeVisible();

    // Stat tiles — match by visible label text.
    await expect(page.getByText(/Failing jobs/i).first()).toBeVisible();
    await expect(page.getByText(/Firing alerts/i).first()).toBeVisible();
    await expect(page.getByText(/Capacity headroom/i).first()).toBeVisible();

    // Audit area should either show a table or an empty-state copy.
    const hasTable = await page.locator("table").first().isVisible().catch(() => false);
    const hasEmpty = await page
      .getByText(/no (recent )?(audit|activity|events)/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });
});
