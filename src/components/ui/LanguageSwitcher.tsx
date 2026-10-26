"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeNames,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatLongDate,
  formatMonthYear,
  formatNumber,
  intlLocale,
} from "@/lib/i18n/format";

export interface Formatters {
  currency: (
    value: number,
    options?: { signDisplay?: "auto" | "always" | "never" },
  ) => string;
  number: (value: number, options?: Intl.NumberFormatOptions) => string;
  date: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  dateTime: (value: Date | string) => string;
  monthYear: (value: Date | string) => string;
  longDate: (value: Date | string) => string;
}

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
  format: Formatters;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => translate(DEFAULT_LOCALE, key),
  format: {
    currency: (value, options) => formatCurrency(value, DEFAULT_LOCALE, options),
    number: (value, options) => formatNumber(value, DEFAULT_LOCALE, options),
    date: (value, options) => formatDate(value, DEFAULT_LOCALE, options),
    dateTime: (value) => formatDateTime(value, DEFAULT_LOCALE),
    monthYear: (value) => formatMonthYear(value, DEFAULT_LOCALE),
    longDate: (value) => formatLongDate(value, DEFAULT_LOCALE),
  },
});

/**
 * The locale is resolved on the server (from the cookie) and handed down, so the
 * first render is already in the right language. Switching writes the cookie for
 * the next request and updates `<html lang>` for assistive technology.
 */
export function LocaleProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE,
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${LOCALE_COOKIE_MAX_AGE};samesite=lax`;
    document.documentElement.lang = intlLocale(next);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);

  const format = useMemo<Formatters>(
    () => ({
      currency: (value, options) => formatCurrency(value, locale, options),
      number: (value, options) => formatNumber(value, locale, options),
      date: (value, options) => formatDate(value, locale, options),
      dateTime: (value) => formatDateTime(value, locale),
      monthYear: (value) => formatMonthYear(value, locale),
      longDate: (value) => formatLongDate(value, locale),
    }),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, format }),
    [locale, setLocale, t, format],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  return useContext(LocaleContext);
}

export function LanguageSwitcher() {
  const { locale, setLocale } = useT();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200/80 bg-zinc-100/80 p-0.5 dark:border-white/5 dark:bg-white/[0.03]">
      {(Object.keys(localeNames) as Locale[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all ${
            locale === option
              ? "bg-white text-zinc-900 shadow-sm dark:bg-white/10 dark:text-white"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          {localeNames[option]}
        </button>
      ))}
    </div>
  );
}
