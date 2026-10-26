/**
 * i18n plumbing: locales, the translation lookup and its types.
 *
 * `en.ts` is the reference dictionary: `TranslationKey` is derived from it, so
 * `t()` only accepts keys that exist and `es.ts` fails to compile if it drifts.
 *
 * The active locale lives in a cookie, which the server reads in the root layout.
 * That is what makes the first paint correct — no Spanish flash for an English
 * reader — and lets `<html lang>` match the content.
 */

import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Spanish is the default: it is the language most of the copy is written for. */
export const DEFAULT_LOCALE: Locale = "es";

/** Cookie that carries the chosen locale between requests. */
export const LOCALE_COOKIE = "trinax-locale";
/** One year, in seconds. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Translations = Record<keyof typeof en, string>;
export type TranslationKey = keyof typeof en;

export const translations: Record<Locale, Translations> = { en, es };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Look up a key. Falls back to the key itself so a missing string is visible in
 * the UI instead of rendering nothing — and the parity test fails first.
 */
export function translate(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? translations[DEFAULT_LOCALE][key] ?? key;
}

export const localeNames: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

export type { Locale as LocaleType };
