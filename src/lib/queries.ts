import type { PrismaClient, Account, Transaction } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export interface DashboardUserData {
  id: string;
  email: string;
  name: string | null;
  accounts: Account[];
  transactions: Transaction[];
  totalBalance: number;
}

/**
 * Fetch full dashboard data for a given user ID.
 * Returns null if the user does not exist.
 * Accepts an optional prisma instance for testing.
 */
export async function getDashboardData(
  userId: string,
  prisma?: PrismaClient,
): Promise<DashboardUserData | null> {
  const client = prisma ?? defaultPrisma;

  const user = await client.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) return null;

  const totalBalance = user.accounts.reduce(
    (sum, acc) => sum + acc.balance,
    0,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accounts: user.accounts,
    transactions: user.transactions,
    totalBalance,
  };
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  income: number;
  spending: number;
}

export interface AnalyticsData {
  spendingByCategory: CategoryTotal[];
  monthly: MonthlyTotal[];
  totalSpending: number;
  totalIncome: number;
  topCategory: string | null;
}

/**
 * Aggregate a user's transactions into spending-by-category and a 6-month
 * income/spending trend. Spending = withdrawals + outgoing transfers;
 * income = deposits + incoming transfers.
 */
export async function getAnalyticsData(
  userId: string,
  prisma?: PrismaClient,
): Promise<AnalyticsData> {
  const client = prisma ?? defaultPrisma;
  const transactions = await client.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const isSpending = (t: Transaction) =>
    t.type === "withdrawal" || t.type === "transfer_out";
  const isIncome = (t: Transaction) =>
    t.type === "deposit" || t.type === "transfer_in";

  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, { income: number; spending: number }>();
  let totalSpending = 0;
  let totalIncome = 0;

  for (const t of transactions) {
    const d = new Date(t.createdAt);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byMonth.get(monthKey) ?? { income: 0, spending: 0 };

    if (isSpending(t)) {
      totalSpending += t.amount;
      bucket.spending += t.amount;
      const cat = t.category || "other";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + t.amount);
    } else if (isIncome(t)) {
      totalIncome += t.amount;
      bucket.income += t.amount;
    }
    byMonth.set(monthKey, bucket);
  }

  const spendingByCategory = Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => b.total - a.total);

  const monthly = Array.from(byMonth.entries())
    .map(([month, v]) => ({
      month,
      income: Math.round(v.income * 100) / 100,
      spending: Math.round(v.spending * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return {
    spendingByCategory,
    monthly,
    totalSpending: Math.round(totalSpending * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    topCategory: spendingByCategory[0]?.category ?? null,
  };
}

/**
 * Look up a user by email for authentication.
 * Returns the user with passwordHash or null.
 * Accepts an optional prisma instance for testing.
 */
export async function getUserByEmail(email: string, prisma?: PrismaClient) {
  const client = prisma ?? defaultPrisma;
  return client.user.findUnique({
    where: { email },
  });
}
