/**
 * Locale-aware formatting.
 *
 * The UI never hardcodes `Intl` locales: every date, number and currency string
 * goes through here with the active locale, so a Spanish reader sees Spanish
 * dates and number separators.
 *
 * Server-side prose (transaction descriptions, notification bodies) is written in
 * English when the row is created; `SERVER_INTL_LOCALE` exists for those call
 * sites so the choice is explicit rather than accidental.
 */

import type { Locale } from "@/lib/i18n";
import { CURRENCY } from "@/lib/domain";

const INTL_LOCALES: Record<Locale, string> = {
  es: "es-ES",
  en: "en-US",
};

/** Intl tag for a UI locale. */
export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}

/** Intl tag used for stored, server-generated text (always English). */
export const SERVER_INTL_LOCALE = "en-US";

export function formatCurrency(
  value: number,
  locale: Locale,
  options: { currency?: string; signDisplay?: "auto" | "always" | "never" } = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: options.currency ?? CURRENCY,
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(intlLocale(locale), options).format(
    Number.isFinite(value) ? value : 0,
  );
}

export function formatDate(
  value: Date | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(value));
}

/** Short date + time, for lists and notification timestamps. */
export function formatDateTime(value: Date | string, locale: Locale): string {
  return formatDate(value, locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Jan 26" / "ene 26", for chart axes. */
export function formatMonthYear(value: Date | string, locale: Locale): string {
  return formatDate(value, locale, { month: "short", year: "2-digit" });
}

/** "January 2026" / "enero de 2026", for headings. */
export function formatLongDate(value: Date | string, locale: Locale): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
