/**
 * Interest accrual.
 *
 * Savings accounts earn interest on their balance; credit accounts accrue
 * interest on outstanding debt. Rates are annual percentages, accrual is simple
 * and daily (no intra-period compounding), and only whole cents are ever posted:
 * a fractional remainder stays unrealized until it reaches a cent.
 *
 * A charge is still stored as type `interest` (the statement signs it from the
 * account type) and categorized as {@link INTEREST_CHARGE_CATEGORY} so income
 * totals do not treat debt interest as money received.
 */

import { isIncomeType, SPENDING_TYPES } from "@/lib/domain";

/** Category on an interest row that decreased the balance (credit debt). */
export const INTEREST_CHARGE_CATEGORY = "bills";

/**
 * Whether a posted row increased the balance. Savings interest is income.
 * A credit-interest charge is type `interest` but categorized as
 * {@link INTEREST_CHARGE_CATEGORY}, so it is a debit.
 */
export function movementIncreasesBalance(transaction: {
  type: string;
  category?: string | null;
}): boolean {
  if (
    transaction.type === "interest" &&
    transaction.category === INTEREST_CHARGE_CATEGORY
  ) {
    return false;
  }
  return isIncomeType(transaction.type);
}

/** Ledger rows that increased a balance. Credit-interest charges are excluded. */
export function incomeMovementWhere(userId: string) {
  return {
    userId,
    OR: [
      { type: { in: ["deposit", "transfer_in"] as string[] } },
      { type: "interest", category: { not: INTEREST_CHARGE_CATEGORY } },
    ],
  };
}

/** Ledger rows that decreased a balance, including credit-interest charges. */
export function spendingMovementWhere(userId: string) {
  return {
    userId,
    OR: [
      { type: { in: [...SPENDING_TYPES] } },
      { type: "interest", category: INTEREST_CHARGE_CATEGORY },
    ],
  };
}

export const DAYS_PER_YEAR = 365;

/** Longest window a single accrual may cover, so a long absence cannot backfill months. */
export const MAX_ACCRUAL_DAYS = 31;

/** Nothing is posted below one cent. */
export const MIN_ACCRUAL_CENTS = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.floor(ms / MS_PER_DAY);
}

/**
 * Days of interest owed for an account as of `now`.
 * A never-accrued account is treated as one day old so the first run posts a
 * single day instead of a large backfill.
 */
export function accrualWindowDays(lastInterestAt: Date | null, now: Date): number {
  if (!lastInterestAt) return 1;
  return Math.min(Math.max(daysBetween(lastInterestAt, now), 0), MAX_ACCRUAL_DAYS);
}

export interface AccrualInput {
  type: string;
  balanceCents: number;
  annualRatePct: number | null;
  days: number;
}

/**
 * Interest accrued over `days`, in cents, signed from the account holder's
 * perspective: positive for savings (the balance grows), negative for credit
 * debt (the balance gets more negative). Returns 0 when nothing is owed.
 */
export function accrualCents(input: AccrualInput): number {
  const { type, balanceCents, annualRatePct, days } = input;
  const rate = annualRatePct ?? 0;
  if (days <= 0 || rate <= 0 || balanceCents === 0) return 0;

  const cents = Math.floor((Math.abs(balanceCents) * rate * days) / 100 / DAYS_PER_YEAR);
  if (cents < MIN_ACCRUAL_CENTS) return 0;

  // Only debt accrues interest on a credit line; only a positive balance earns
  // interest on a deposit account.
  if (type === "credit") return balanceCents < 0 ? -cents : 0;
  return balanceCents > 0 ? cents : 0;
}
