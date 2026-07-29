import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should display login page with form elements", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();

    // Check page elements
    await expect(page.locator("h1")).toHaveText("Welcome back");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i }),
    ).toBeVisible();
  });

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();

    await page.locator('input[name="email"]').fill("wrong@email.com");
    await page.locator('input[name="password"]').fill("wrongpass");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error message (stay on login page with error)
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test("should login with valid demo credentials and redirect to dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();

    await page.locator('input[name="email"]').fill("demo@banking.app");
    await page.locator('input[name="password"]').fill("demo-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });
});
