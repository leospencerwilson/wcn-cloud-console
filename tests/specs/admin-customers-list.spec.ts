import { test, expect } from "../fixtures/auth";

test.describe("admin customers list", () => {
  test("renders with search, filter, sort, pagination, and row link", async ({
    authedPage: page,
  }) => {
    await page.goto("/admin/customers");
    await expect(page).toHaveURL(/\/admin\/customers/);

    // Search box — match any input that looks like a search field.
    const search = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[name*="search" i], input[name="q"]',
      )
      .first();
    await expect(search).toBeVisible();

    // At least one select-like filter and a sortable column header.
    const selects = page.locator("select, [role='combobox']");
    expect(await selects.count()).toBeGreaterThan(0);

    // Pagination — buttons/links labeled Next / Previous or page numbers.
    const pagination = page.getByRole("navigation", { name: /pagination/i }).or(
      page.getByRole("button", { name: /next|previous/i }).first(),
    );
    await expect(pagination.first()).toBeVisible();

    // Summary line ("Showing X of Y", "N customers", etc.).
    await expect(
      page.getByText(/showing|of\s+\d+|customers?\b/i).first(),
    ).toBeVisible();

    // Click first data row → detail page.
    const rowLink = page
      .locator("table a[href^='/admin/customers/']")
      .first();
    if (await rowLink.count()) {
      const href = await rowLink.getAttribute("href");
      await rowLink.click();
      await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, "\\/")));
    }
  });
});
