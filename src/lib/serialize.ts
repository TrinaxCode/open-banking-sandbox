/**
 * Money boundary: Prisma rows (cents) → UI objects (decimal currency units).
 *
 * Server Components read cent-precise rows, and every object handed to a Client
 * Component goes through one of these serializers. They also convert `Date` to
 * ISO strings, because that is what survives the RSC boundary.
 *
 * Components must never receive a raw Prisma row: a `balanceCents` leaking into
 * the UI would render as "1250000" instead of "$12,500.00".
 */

import type {
  Account,
  Beneficiary,
  Notification,
  RecurringTransfer,
  SavingsGoal,
  Transaction,
  User,
  VirtualCard,
} from "@prisma/client";
import type {
  AccountType,
  NotificationType,
  RecurringFrequency,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from "@/lib/domain";
import { fromCents } from "@/lib/money";
import type {
  AccountForUi,
  BeneficiaryForUi,
  NotificationForUi,
  ProfileForUi,
  RecurringTransferForUi,
  SavingsGoalForUi,
  TransactionForUi,
  VirtualCardForUi,
} from "@/types/ui";

/** Generic RSC-safe copy (dates → ISO strings). */
export function serialize<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function money(cents: number): number {
  return fromCents(cents);
}

function moneyOrNull(cents: number | null): number | null {
  return cents === null ? null : fromCents(cents);
}

// The `as` casts below are the single place where the free-form strings stored
// in SQLite become domain unions. Values are validated by Zod before every
// write (see src/lib/domain.ts), so these are guaranteed by construction.

export function serializeAccount(account: Account): AccountForUi {
  return {
    id: account.id,
    userId: account.userId,
    type: account.type as AccountType,
    number: account.number,
    nickname: account.nickname,
    balance: money(account.balanceCents),
    creditLimit: moneyOrNull(account.creditLimitCents),
    interestRate: account.interestRate,
    dueDate: account.dueDate,
    lastInterestAt: toIso(account.lastInterestAt),
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export function serializeAccounts(accounts: Account[]): AccountForUi[] {
  return accounts.map(serializeAccount);
}

export function serializeTransaction(transaction: Transaction): TransactionForUi {
  return {
    id: transaction.id,
    userId: transaction.userId,
    accountId: transaction.accountId,
    targetAccountId: transaction.targetAccountId,
    type: transaction.type as TransactionType,
    amount: money(transaction.amountCents),
    description: transaction.description,
    reference: transaction.reference,
    category: transaction.category as TransactionCategory,
    status: transaction.status as TransactionStatus,
    notes: transaction.notes ?? null,
    createdAt: transaction.createdAt.toISOString(),
  };
}

export function serializeTransactions(transactions: Transaction[]): TransactionForUi[] {
  return transactions.map(serializeTransaction);
}

export function serializeGoal(goal: SavingsGoal): SavingsGoalForUi {
  return {
    id: goal.id,
    userId: goal.userId,
    accountId: goal.accountId,
    name: goal.name,
    targetAmount: money(goal.targetAmountCents),
    currentAmount: money(goal.currentAmountCents),
    color: goal.color,
    deadline: toIso(goal.deadline),
    achievedAt: toIso(goal.achievedAt),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

export function serializeGoals(goals: SavingsGoal[]): SavingsGoalForUi[] {
  return goals.map(serializeGoal);
}

export function serializeRecurringTransfer(
  transfer: RecurringTransfer,
): RecurringTransferForUi {
  return {
    id: transfer.id,
    userId: transfer.userId,
    fromAccountId: transfer.fromAccountId,
    targetAccountNumber: transfer.targetAccountNumber,
    amount: money(transfer.amountCents),
    frequency: transfer.frequency as RecurringFrequency,
    description: transfer.description,
    nextRunAt: transfer.nextRunAt.toISOString(),
    lastRunAt: toIso(transfer.lastRunAt),
    active: transfer.active,
    createdAt: transfer.createdAt.toISOString(),
    updatedAt: transfer.updatedAt.toISOString(),
  };
}

export function serializeRecurringTransfers(
  transfers: RecurringTransfer[],
): RecurringTransferForUi[] {
  return transfers.map(serializeRecurringTransfer);
}

export function serializeCard(card: VirtualCard): VirtualCardForUi {
  return {
    id: card.id,
    userId: card.userId,
    cardNumber: card.cardNumber,
    cardHolder: card.cardHolder,
    expiryDate: card.expiryDate,
    cvv: card.cvv,
    isFrozen: card.isFrozen,
    isTemporary: card.isTemporary,
    expiresAt: toIso(card.expiresAt),
    maxUses: card.maxUses,
    usageCount: card.usageCount,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function serializeCards(cards: VirtualCard[]): VirtualCardForUi[] {
  return cards.map(serializeCard);
}

export function serializeBeneficiary(beneficiary: Beneficiary): BeneficiaryForUi {
  return {
    id: beneficiary.id,
    userId: beneficiary.userId,
    name: beneficiary.name,
    accountNumber: beneficiary.accountNumber,
    nickname: beneficiary.nickname,
    createdAt: beneficiary.createdAt.toISOString(),
  };
}

export function serializeBeneficiaries(beneficiaries: Beneficiary[]): BeneficiaryForUi[] {
  return beneficiaries.map(serializeBeneficiary);
}

export function serializeNotification(notification: Notification): NotificationForUi {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type as NotificationType,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function serializeNotifications(
  notifications: Notification[],
): NotificationForUi[] {
  return notifications.map(serializeNotification);
}

export function serializeProfile(user: User, accounts: Account[]): ProfileForUi {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountNumber: user.accountNumber,
    createdAt: user.createdAt.toISOString(),
    totalBalance: money(accounts.reduce((sum, account) => sum + account.balanceCents, 0)),
    accountCount: accounts.length,
    notifyLowBalance: user.notifyLowBalance,
    notifyLargeTx: user.notifyLargeTx,
    lowBalanceThreshold: money(user.lowBalanceThresholdCents),
    largeTxThreshold: money(user.largeTxThresholdCents),
  };
}
