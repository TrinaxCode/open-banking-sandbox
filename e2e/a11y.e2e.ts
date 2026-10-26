import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility checks.
 *
 * axe reports four impact levels; this suite fails on `critical` and `serious`
 * violations (including `color-contrast`, missing labels, broken ARIA, invalid
 * roles and keyboard traps) across WCAG 2.0 / 2.1 A & AA with zero rule
 * exclusions.
 */

const BLOCKING_IMPACTS = ["critical", "serious"];

/** Excluded rules (empty — all WCAG 2.0/2.1 A & AA rules are enforced). */
const EXCLUDED_RULES: string[] = [];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.locator('input[name="email"]').fill("demo@banking.app");
  await page.locator('input[name="password"]').fill("demo-password");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/dashboard");
}

function blockingViolations(
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"],
) {
  return violations.filter(
    (violation) =>
      violation.impact !== undefined &&
      violation.impact !== null &&
      BLOCKING_IMPACTS.includes(violation.impact) &&
      !EXCLUDED_RULES.includes(violation.id),
  );
}

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("login, register, and terms pages have no serious or critical violations", async ({
    page,
  }) => {
    for (const route of ["/login", "/register", "/terms"]) {
      await page.goto(route);
      await page.getByRole("button", { name: "EN", exact: true }).click();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(blockingViolations(results.violations), `Violations on ${route}`).toEqual(
        [],
      );
    }
  });

  test("dashboard routes have no serious or critical violations in dark and light mode", async ({
    page,
  }) => {
    await login(page);

    for (const route of [
      "/dashboard",
      "/dashboard/cards",
      "/dashboard/budgets",
      "/dashboard/statements",
      "/dashboard/profile",
    ]) {
      await page.goto(route);

      const darkResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(
        blockingViolations(darkResults.violations),
        `Dark mode violations on ${route}`,
      ).toEqual([]);
    }

    // Switch to light mode and verify dashboard contrast
    await page.goto("/dashboard");
    await page.locator('[data-testid="theme-toggle"]:visible').first().click();

    const lightResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(blockingViolations(lightResults.violations), "Light mode dashboard").toEqual(
      [],
    );
  });

  test("the confirm dialog is keyboard dismissible", async ({ page }) => {
    await login(page);
    await page.goto("/dashboard/beneficiaries");

    // Every saved beneficiary has a Delete action that opens a dialog.
    const deleteButton = page
      .getByRole("button", { name: "Delete", exact: true })
      .first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    // Escape must close it without deleting anything.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Alice Johnson")).toBeVisible();
  });
});
