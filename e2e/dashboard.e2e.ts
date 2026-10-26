import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.locator('input[name="email"]').fill("demo@banking.app");
    await page.locator('input[name="password"]').fill("demo-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });

  test("should display dashboard with balance card", async ({ page }) => {
    await expect(page.getByText("Total Balance")).toBeVisible();
    await expect(page.getByText(/^\$[\d,]+\.\d{2}$/).first()).toBeVisible();
  });

  test("should display accounts section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Accounts", exact: true }),
    ).toBeVisible();
    // The demo accounts are seeded with nicknames, which take precedence over
    // the type label.
    await expect(page.getByText("Everyday").first()).toBeVisible();
    await expect(page.getByText("Rainy day").first()).toBeVisible();
    await expect(page.getByText("CHK-001001").first()).toBeVisible();
  });

  test("should display recent transactions", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Transactions", exact: true }),
    ).toBeVisible();
    // Should have transaction rows
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("should display sidebar with user name", async ({ page }) => {
    await expect(page.getByText("Demo User").first()).toBeVisible();
    await expect(page.getByAltText("Trinax Bank").first()).toBeVisible();
  });

  test("should logout and redirect to login", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect to login when accessing dashboard unauthenticated", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
