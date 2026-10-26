/**
 * Calendar arithmetic that does not let a day-of-month overflow.
 *
 * `Date#setMonth` and `new Date(year, month, day)` both roll 31 January into
 * March. Callers that walk a window (analytics buckets, the dashboard chart)
 * then skip a month and repeat another.
 */

/** Add `months` calendar months, clamping the day to the target month. */
export function addCalendarMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}
