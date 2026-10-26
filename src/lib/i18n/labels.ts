/**
 * Typed key maps for values that come from the database.
 *
 * `t()` only accepts literal keys, so a label built from a domain value (an
 * account type, a transaction type, a category) goes through one of these maps
 * instead of a template string. Adding a value to `src/lib/domain.ts` without a
 * translation is then a type error, not a missing string at runtime.
 */

import type {
  AccountType,
  RecurringFrequency,
  TransactionCategory,
  TransactionType,
} from "@/lib/domain";
import type { TranslationKey } from "@/lib/i18n";

export const ACCOUNT_TYPE_KEYS: Record<AccountType, TranslationKey> = {
  checking: "account.checking",
  savings: "account.savings",
  credit: "account.credit",
};

export const TRANSACTION_TYPE_KEYS: Record<TransactionType, TranslationKey> = {
  deposit: "tx.deposit",
  withdrawal: "tx.withdrawal",
  transfer_in: "tx.transferIn",
  transfer_out: "tx.transferOut",
  interest: "tx.interest",
  fee: "tx.fee",
};

/** Plural labels used by the history filter pills. */
export const TRANSACTION_TYPE_FILTER_KEYS: Record<TransactionType, TranslationKey> = {
  deposit: "tx.deposits",
  withdrawal: "tx.withdrawals",
  transfer_in: "tx.transfersIn",
  transfer_out: "tx.transfersOut",
  interest: "tx.interest",
  fee: "tx.fee",
};

export const CATEGORY_KEYS: Record<TransactionCategory, TranslationKey> = {
  income: "category.income",
  transfer: "category.transfer",
  food: "category.food",
  shopping: "category.shopping",
  bills: "category.bills",
  transport: "category.transport",
  entertainment: "category.entertainment",
  health: "category.health",
  travel: "category.travel",
  other: "category.other",
};

export const FREQUENCY_KEYS: Record<RecurringFrequency, TranslationKey> = {
  daily: "sched.daily",
  weekly: "sched.weekly",
  monthly: "sched.monthly",
};

export const SECURITY_ACTION_KEYS: Record<string, TranslationKey> = {
  login: "security.login",
  password_change: "security.passwordChange",
  account_created: "security.accountCreated",
  card_created: "security.cardCreated",
  card_frozen: "security.cardFrozen",
  card_unfrozen: "security.cardUnfrozen",
  card_purchase: "security.cardPurchase",
  step_up_failed: "security.stepUpFailed",
  data_exported: "security.dataExported",
  transfer: "security.transfer",
  budget_set: "security.budgetSet",
  profile_updated: "security.profileUpdated",
};

/** The label for a stored account type, falling back to the raw value. */
export function accountTypeKey(type: string): TranslationKey {
  return ACCOUNT_TYPE_KEYS[type as AccountType] ?? "account.checking";
}
