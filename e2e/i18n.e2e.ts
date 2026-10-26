import { test, expect } from "@playwright/test";

/**
 * i18n behaviour from the outside.
 *
 * The locale lives in a cookie that the server reads, so the first paint is
 * already in the right language. These tests check the server-rendered HTML
 * directly — a client-side patch would leave the Spanish copy in the response
 * and flash it before switching.
 */
test.describe("Localisation", () => {
  test("Spanish is the default and the server renders it", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("html")).toHaveAttribute("lang", "es-ES");
    await expect(page.locator("h1")).toHaveText("Bienvenido");

    const html = await (await page.request.get("/login")).text();
    expect(html).toContain("Bienvenido");
  });

  test("switching to English updates the page, the cookie and the document language", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "EN", exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.locator("h1")).toHaveText("Welcome back");

    // The cookie makes the next request render in English server-side.
    await page.reload();
    const html = await (await page.request.get("/login")).text();
    expect(html).toContain("Welcome back");
    expect(html).not.toContain("Bienvenido");
  });

  test("the dashboard is translated and formats match the locale", async ({ page }) => {
    await page.goto("/login");
    // Clicking the already-active locale doubles as a hydration barrier: the
    // form ignores pre-hydration fills, which leaves the submit button disabled.
    await page.getByRole("button", { name: "ES", exact: true }).click();

    await page.locator('input[name="email"]').fill("demo@banking.app");
    await page.locator('input[name="password"]').fill("demo-password");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL("/dashboard");

    await expect(page.getByRole("heading", { name: /Bienvenido/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Resumen" })).toBeVisible();

    // Spanish formatting: dot as thousands separator, "US$" as the symbol.
    await expect(page.locator("body")).toContainText(/\d{1,3}(\.\d{3})*,\d{2}\s?US\$/);
  });
});
