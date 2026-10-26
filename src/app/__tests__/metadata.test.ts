import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("robots()", () => {
  it("disallows private dashboard and api paths while allowing public routes", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(rules?.allow).toContain("/login");
    expect(rules?.allow).toContain("/register");
    expect(rules?.allow).toContain("/terms");
    expect(rules?.disallow).toContain("/dashboard/");
    expect(rules?.disallow).toContain("/api/");
    expect(config.sitemap).toMatch(/sitemap\.xml$/);
  });
});

describe("sitemap()", () => {
  it("includes all public pages with valid priorities", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/login"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/register"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/terms"))).toBe(true);

    for (const entry of entries) {
      expect(entry.priority).toBeGreaterThan(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
