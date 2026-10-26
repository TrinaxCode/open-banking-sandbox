/**
 * Domain vocabulary — the single source of truth for value sets and defaults.
 *
 * The SQLite connector does not support Prisma `enum`, so columns such as
 * `Account.type` or `Transaction.status` are plain strings in the database.
 * Every write goes through the service layer, where these unions are enforced
 * with Zod schemas derived from the constants below. Keeping the list here
 * means TypeScript, validation and the API docs can never drift apart.
 */

export const CURRENCY = "USD";
export const DEFAULT_LOCALE = "en-US";

// ── Accounts ────────────────────────────────────────────
export const ACCOUNT_TYPES = ["checking", "savings", "credit"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_PREFIXES: Record<AccountType, string> = {
  checking: "CHK",
  savings: "SAV",
  credit: "CRD",
};

/** Account numbers look like `CHK-A1B2C3`; user handles look like `USR-A1B2C3`. */
export const ACCOUNT_NUMBER_PATTERN = /^(CHK|SAV|CRD|USR)-[A-Z0-9]{6}$/;

/** Annual interest rate (percent) applied when an account is opened. */
export const DEFAULT_INTEREST_RATES: Record<AccountType, number> = {
  checking: 0,
  savings: 3.5,
  credit: 19.99,
};

/** Fallback credit line for credit accounts that have none configured ($10,000). */
export const DEFAULT_CREDIT_LIMIT_CENTS = 1_000_000;

/** Payment due day of month for credit accounts. */
export const DEFAULT_DUE_DATE = "15";

// ── Transactions ────────────────────────────────────────
export const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "transfer_in",
  "transfer_out",
  "interest",
  "fee",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["completed", "pending", "failed"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Transaction types that increase an account balance. */
export const INCOME_TYPES = ["deposit", "transfer_in", "interest"] as const;

/** Transaction types that decrease an account balance. */
export const SPENDING_TYPES = ["withdrawal", "transfer_out", "fee"] as const;

export function isIncomeType(type: string): boolean {
  return (INCOME_TYPES as readonly string[]).includes(type);
}

// ── Scheduled transfers ─────────────────────────────────
export const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

// ── Notifications ───────────────────────────────────────
export const NOTIFICATION_TYPES = [
  "low_balance",
  "large_tx",
  "scheduled",
  "goal",
  "info",
  "interest",
  "fee",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── Spending categories ─────────────────────────────────
export const TRANSACTION_CATEGORIES = [
  "income",
  "transfer",
  "food",
  "shopping",
  "bills",
  "transport",
  "entertainment",
  "health",
  "travel",
  "other",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
