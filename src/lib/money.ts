/**
 * Money utilities — cents-first.
 *
 * Every monetary column in the database is an integer number of CENTS, so all
 * arithmetic server-side is exact integer arithmetic: no IEEE-754 drift can
 * accumulate in a balance and `balance >= amount` comparisons are unambiguous.
 *
 * There are exactly two units in the codebase and one place they meet:
 *   - Cents: database, services, jobs and the public API (`*Cents` fields).
 *   - Decimal currency units (dollars): React Client Components.
 * `src/lib/serialize.ts` converts cents → decimals at the page boundary, so
 * components never see cents and services never see dollars.
 */

import { CURRENCY, DEFAULT_LOCALE } from "@/lib/domain";

/** Largest amount a single operation may move: $9,999,999.99. */
export const MAX_TRANSACTION_CENTS = 999_999_999;

/** Convert a decimal currency value to integer cents (rounds to nearest cent). */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // The epsilon nudges values like 1.005 (stored as 1.00499999999) upward so
  // they round to the cent a human would expect.
  return Math.round((value + Number.EPSILON) * 100);
}

/** Convert integer cents back to a decimal currency value. */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/** Exact difference of two cent values. */
export function subCents(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}

/** True when a cent value is zero (tolerates a non-integer passed in). */
export function isZeroCents(cents: number): boolean {
  return Math.round(cents) === 0;
}

/** Format a cent value as a localized currency string (default USD). */
export function formatCents(
  cents: number,
  currency = CURRENCY,
  locale = DEFAULT_LOCALE,
): string {
  return formatMoney(fromCents(cents), currency, locale);
}

/**
 * Format a DECIMAL currency value (the UI side of the boundary).
 * Services should use `formatCents` instead.
 */
export function formatMoney(
  value: number,
  currency = CURRENCY,
  locale = DEFAULT_LOCALE,
  options: { signDisplay?: "auto" | "always" | "never" } = {},
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(options.signDisplay ? { signDisplay: options.signDisplay } : {}),
  }).format(Number.isFinite(value) ? value : 0);
}
