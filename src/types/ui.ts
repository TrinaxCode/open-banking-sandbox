/**
 * UI contracts for React Client Components.
 *
 * These mirror the Prisma models with two deliberate differences:
 *   1. Money is in DECIMAL currency units (dollars), never cents.
 *   2. Dates are ISO strings, because that is what survives the RSC boundary.
 *
 * `src/lib/serialize.ts` produces these objects at the page boundary — pages
 * must not hand-build them, and components must never receive a raw Prisma row
 * (which would carry cents).
 */

import type {
  AccountType,
  NotificationType,
  RecurringFrequency,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from "@/lib/domain";

export interface AccountForUi {
  id: string;
  userId: string;
  type: AccountType;
  number: string;
  nickname: string | null;
  balance: number;
  creditLimit: number | null;
  interestRate: number | null;
  dueDate: string | null;
  lastInterestAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionForUi {
  id: string;
  userId: string;
  accountId: string | null;
  targetAccountId: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  reference: string | null;
  category: TransactionCategory;
  status: TransactionStatus;
  notes?: string | null;
  createdAt: string;
}

export interface SavingsGoalForUi {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  deadline: string | null;
  achievedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransferForUi {
  id: string;
  userId: string;
  fromAccountId: string;
  targetAccountNumber: string;
  amount: number;
  frequency: RecurringFrequency;
  description: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VirtualCardForUi {
  id: string;
  userId: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  isFrozen: boolean;
  isTemporary: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BeneficiaryForUi {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  nickname: string | null;
  createdAt: string;
}

export interface NotificationForUi {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ProfileForUi {
  id: string;
  email: string;
  name: string | null;
  accountNumber: string;
  createdAt: string;
  totalBalance: number;
  accountCount: number;
  notifyLowBalance: boolean;
  notifyLargeTx: boolean;
  lowBalanceThreshold: number;
  largeTxThreshold: number;
}

export interface CategoryBudgetForUi {
  id: string;
  category: TransactionCategory;
  budgetLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export interface SecurityLogForUi {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}
