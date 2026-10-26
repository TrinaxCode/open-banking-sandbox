import { test, expect } from "@playwright/test";

test.describe("Asynchronous creation forms", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.getByLabel("Email").fill("demo@banking.app");
    await page.getByLabel("Password", { exact: true }).fill("demo-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/dashboard");
  });

  test("creates a schedule, resets its form and persists it after reload", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/dashboard/scheduled");

    await expect(page.getByText(/fee applies when the destination/)).toBeVisible();
    await page.getByLabel("From account").selectOption({ index: 1 });
    await page.getByLabel("To account number").fill("SAV-001001");
    await page.getByLabel("Amount", { exact: true }).fill("0.01");
    // Keep the test schedule from posting money during subsequent dashboard visits.
    await page.getByLabel("Start date (optional)").fill("2099-01-01");
    await page.getByLabel("Description (optional)").fill("E2E scheduled transfer");
    await page.getByRole("button", { name: "Create schedule" }).click();

    await expect(page.getByText("E2E scheduled transfer", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("");
    await expect(page.getByRole("button", { name: "Create schedule" })).toBeEnabled();
    await page.reload();

    const card = page.locator("div.rounded-2xl").filter({
      has: page.getByText("E2E scheduled transfer", { exact: true }),
    });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(card).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("adds a beneficiary, resets its form and persists it after reload", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/dashboard/beneficiaries");

    await page.getByLabel("Name", { exact: true }).fill("E2E beneficiary");
    await page.getByLabel("Account number", { exact: true }).fill("CHK-Z9Y8X7");
    await page.getByRole("button", { name: "Add beneficiary", exact: true }).click();

    await expect(page.getByText("E2E beneficiary", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "Add beneficiary", exact: true }),
    ).toBeEnabled();
    await page.reload();

    const card = page.locator("div.rounded-2xl").filter({
      has: page.getByText("E2E beneficiary", { exact: true }),
    });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(card).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
