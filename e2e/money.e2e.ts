import { test, expect, type Page } from "@playwright/test";

/**
 * Guards the money boundary from the outside.
 *
 * The database, the services and the API speak in cents; the UI must speak in
 * dollars. If a conversion is ever skipped, a balance renders as "524075"
 * instead of "$5,240.75" — which is exactly what these assertions look for.
 */

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.locator('input[name="email"]').fill("demo@banking.app");
  await page.locator('input[name="password"]').fill("demo-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/dashboard");
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
}

const PAGES = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/transactions", "History"],
  ["/dashboard/analytics", "Analytics"],
  ["/dashboard/goals", "Goals"],
  ["/dashboard/budgets", "Budgets"],
  ["/dashboard/statements", "Statements"],
  ["/dashboard/scheduled", "Scheduled"],
  ["/dashboard/profile", "Profile"],
] as const;

test.describe("Money boundary", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const [path, title] of PAGES) {
    test(`${title} shows currency, never raw cents`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();

      const text = await page.locator("body").innerText();

      // Account suffixes may be six digits; only other bare digit runs are money leaks.
      const withoutAccounts = text.replace(/\b(?:CHK|SAV|CRD|USR)-[A-Z0-9]{6}\b/g, "");
      const rawCents = withoutAccounts.match(/\d{5,}/g) ?? [];
      expect(rawCents).toEqual([]);

      // Sanity check: formatted money is present somewhere on every page.
      expect(text).toMatch(/\$[\d,]+\.\d{2}/);
    });
  }

  test("transfer review quotes the fee and the total debited", async ({ page }) => {
    await page.goto("/dashboard/transfer");
    await page.getByRole("button", { name: "External" }).click();

    const from = page.locator('select[name="fromAccountId"]');
    await from.selectOption({ index: 1 });
    await page.locator('input[name="targetAccountNumber"]').fill("CHK-AB12CD");
    await page.locator('input[name="amount"]').fill("25");

    await page.getByRole("button", { name: /Review Transfer/ }).click();

    // $25.00 + the $1.00 fee, derived from the same policy the server applies.
    await expect(page.getByText("Fee", { exact: true })).toBeVisible();
    await expect(page.getByText("$1.00", { exact: true })).toBeVisible();
    await expect(page.getByText("Total debited", { exact: true })).toBeVisible();
    await expect(page.getByText("$26.00", { exact: true })).toBeVisible();
  });
});
