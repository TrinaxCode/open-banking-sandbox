import { describe, expect, it, beforeEach } from "vitest";
import { resolveTheme, THEME_BOOTSTRAP_SCRIPT } from "./theme";

function runBootstrap(options: {
  cookie: string;
  className: string;
  colorScheme: string;
  stored: string | null;
}) {
  document.cookie = options.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part}; path=/`)
    .join(" ");
  // jsdom stores one cookie assignment at a time; set the theme cookie directly.
  const themeCookie = options.cookie.match(/trinax-theme=[^;]*/)?.[0];
  if (themeCookie) document.cookie = `${themeCookie}; path=/`;
  document.documentElement.className = options.className;
  document.documentElement.style.colorScheme = options.colorScheme;
  if (options.stored == null) localStorage.removeItem("trinax-theme");
  else localStorage.setItem("trinax-theme", options.stored);
  window.eval(THEME_BOOTSTRAP_SCRIPT);
  return {
    className: document.documentElement.className,
    colorScheme: document.documentElement.style.colorScheme,
  };
}

describe("resolveTheme", () => {
  it("follows the server cookie rule", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme(undefined)).toBe("dark");
    expect(resolveTheme("nope")).toBe("dark");
  });
});

describe("theme bootstrap script", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    document.cookie = "trinax-theme=; path=/; max-age=0";
  });

  it("keeps the server light class when localStorage is dark", () => {
    const result = runBootstrap({
      cookie: "trinax-theme=light",
      className: "light",
      colorScheme: "light",
      stored: "dark",
    });
    expect(result.className).toBe("light");
    expect(result.colorScheme).toBe("light");
  });

  it("keeps the server dark class when localStorage is light", () => {
    const result = runBootstrap({
      cookie: "trinax-theme=dark",
      className: "dark",
      colorScheme: "dark",
      stored: "light",
    });
    expect(result.className).toBe("dark");
    expect(result.colorScheme).toBe("dark");
  });

  it("fills a missing class from the cookie, not from localStorage", () => {
    const result = runBootstrap({
      cookie: "trinax-theme=light",
      className: "",
      colorScheme: "",
      stored: "dark",
    });
    expect(result.className).toBe("light");
    expect(result.colorScheme).toBe("light");
  });
});
