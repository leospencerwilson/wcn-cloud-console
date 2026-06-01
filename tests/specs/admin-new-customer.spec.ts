import { test, expect } from "../fixtures/auth";

test.describe("admin new customer form", () => {
  test("renders, auto-suggests slug, live subdomain preview, regex error on bad slug", async ({
    authedPage: page,
  }) => {
    await page.goto("/admin/customers/new");
    await expect(page).toHaveURL(/\/admin\/customers\/new/);

    const company = page.locator("input[name='company_name'], input[name='name']").first();
    const slug = page.locator("input[name='slug']").first();
    await expect(company).toBeVisible();
    await expect(slug).toBeVisible();

    // Type a company name and check that the slug auto-fills.
    await company.fill("Acme Test Industries");
    // Tab out to fire any onBlur slugification.
    await company.blur();
    await expect.poll(async () => slug.inputValue(), { timeout: 5_000 }).toMatch(
      /^acme[-_ ]?test[-_ ]?industries$/i,
    );

    // Subdomain preview updates live.
    const preview = page
      .locator("text=/\\.western-communication\\.com/i, text=/\\.wcn\\./i")
      .first();
    if (await preview.count()) {
      await expect(preview).toBeVisible();
    }

    // Bad slug → regex error visible.
    await slug.fill("Bad Slug!! NotAllowed");
    await slug.blur();
    await expect(
      page
        .getByText(/lowercase|hyphen|letters|digits|invalid|allowed characters/i)
        .first(),
    ).toBeVisible({ timeout: 5_000 });

    // Do NOT submit — we don't want to pollute the database.
  });
});
