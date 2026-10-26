"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useT } from "@/components/ui/LanguageSwitcher";
import {
  applyDocumentTheme,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type Theme,
} from "@/lib/theme";

export type { Theme } from "@/lib/theme";
export { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from "@/lib/theme";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({
  initialTheme = "dark",
  children,
}: {
  initialTheme?: Theme;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  // The server theme wins. A stale localStorage value must not repaint <html> after hydration.
  useEffect(() => {
    applyDocumentTheme(initialTheme);
    try {
      localStorage.setItem(THEME_COOKIE, initialTheme);
    } catch {
      // LocalStorage access might fail in private browsing
    }
  }, [initialTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_COOKIE, next);
    } catch {
      // Ignore storage errors
    }
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;
    applyDocumentTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme }),
    [theme, toggleTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();

  const label = theme === "dark" ? t("theme.light") : t("theme.dark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={t("theme.toggle")}
      title={label}
      className={`group flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200/80 bg-zinc-100/80 text-zinc-600 shadow-sm transition-all hover:bg-zinc-200 hover:text-zinc-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white ${className}`.trim()}
    >
      <svg
        className={`h-4 w-4 transition-transform duration-300 ${
          theme === "dark" ? "group-hover:rotate-45" : "group-hover:-rotate-12"
        }`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity={0.2} />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        ) : (
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
            fillOpacity={0.2}
          />
        )}
      </svg>
    </button>
  );
}
