/**
 * Money utilities — single source of truth for currency handling.
 *
 * Balances and amounts are stored as `Float` in SQLite, which is prone to
 * IEEE-754 drift (0.1 + 0.2 !== 0.3). To avoid that drift accumulating in
 * account balances, every monetary value that we WRITE to the database is
 * first normalized to 2 decimal places with integer-cent rounding.
 *
 * Rule of thumb:
 *   - Round any amount with `roundMoney()` before persisting or comparing.
 *   - Use `toCents()` when you need exact integer arithmetic.
 *   - Use `formatMoney()` for display.
 */

/** Round a monetary value to 2 decimal places using integer-cent rounding. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // Add a tiny epsilon before rounding to counter representation error
  // (e.g. 1.005 -> 100.49999 -> would round down without the nudge).
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Convert a monetary value to an integer number of cents. */
export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

/** Convert integer cents back to a decimal currency value. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Add monetary values without floating drift (returns rounded result). */
export function addMoney(...values: number[]): number {
  return fromCents(values.reduce((sum, v) => sum + toCents(v), 0));
}

/** Subtract `b` from `a` without floating drift (returns rounded result). */
export function subtractMoney(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}

/** Sum a list of monetary values without floating drift. */
export function sumMoney(values: number[]): number {
  return fromCents(values.reduce((sum, v) => sum + toCents(v), 0));
}

/**
 * Treat a balance as effectively zero when it is within half a cent of 0.
 * Guards against `balance !== 0` failing due to float dust.
 */
export function isEffectivelyZero(value: number): boolean {
  return Math.abs(value) < 0.005;
}

/** Format a monetary value as a localized currency string (default USD). */
export function formatMoney(
  value: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(roundMoney(value));
}
