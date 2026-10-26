export type Theme = "dark" | "light";

export const THEME_COOKIE = "trinax-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Cookie value the server renders onto `<html>`. Anything other than light is dark. */
export function resolveTheme(value: string | null | undefined): Theme {
  return value === "light" ? "light" : "dark";
}

/**
 * Runs before hydration. The server already stamped `class` and `color-scheme`
 * from the cookie, so this must not replace that class with localStorage.
 * It only fills the attribute when the document has neither theme class.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){
  try {
    var root = document.documentElement;
    if (root.classList.contains("light") || root.classList.contains("dark")) return;
    var match = document.cookie.match(/(?:^|;\\s*)trinax-theme=(light|dark)(?:;|$)/);
    var theme = match && match[1] === "light" ? "light" : "dark";
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();`;

export function applyDocumentTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}
