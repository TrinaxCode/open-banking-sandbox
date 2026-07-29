import type { User, Account, Transaction } from "@prisma/client";

// ── User types ──────────────────────────────────────────
export type SafeUser = Omit<User, "passwordHash">;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

// ── Account types ───────────────────────────────────────
export type AccountWithDetails = Account & {
  user?: SafeUser;
};

// ── Transaction types ───────────────────────────────────
export type TransactionWithDetails = Transaction & {
  user?: SafeUser;
  account?: Account | null;
};

export interface TransactionSummary {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: Date;
}

// ── Dashboard types ─────────────────────────────────────
export interface DashboardData {
  user: SessionUser;
  accounts: AccountWithDetails[];
  recentTransactions: TransactionSummary[];
  totalBalance: number;
}
