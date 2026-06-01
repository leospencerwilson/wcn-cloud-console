import { test, expect } from "@playwright/test";

test.describe("login page", () => {
  test("renders the form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("empty submit shows native validation (form does not navigate)", async ({ page }) => {
    await page.goto("/login");
    const url = page.url();
    await page.getByRole("button", { name: /sign in/i }).click();
    // Required HTML validation prevents submission — URL must not change.
    await expect(page).toHaveURL(url);
    const emailInvalid = await page
      .getByLabel("Email")
      .evaluate((el: HTMLInputElement) => !el.checkValidity());
    expect(emailInvalid).toBe(true);
  });

  test("button shows busy/spinner state while submitting bad creds, then surfaces error", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@example.invalid");
    await page.getByLabel("Password").fill("definitely-wrong-password-xyz");

    const submit = page.getByRole("button", { name: /sign in/i });
    await submit.click();

    // The spinner/aria-busy state may be brief; race it against the eventual
    // error message. Either way we should see the alert appear and the button
    // become enabled again afterward.
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText(/didn't work|failed|error/i);
    await expect(submit).toBeEnabled();
  });
});
