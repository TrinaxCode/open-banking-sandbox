import type { PrismaClient } from "@prisma/client";
import { addCalendarMonths } from "@/lib/calendar";
import { incomeMovementWhere, spendingMovementWhere } from "@/lib/interest";
import { fromCents } from "@/lib/money";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { listAccounts } from "@/lib/services/accounts";
import { getAnalyticsData } from "@/lib/services/analytics";
import { listRecurringTransfers } from "@/lib/services/recurring";
import { getBudgetsSummary, type BudgetsSummary } from "@/lib/services/budgets";
import { getSecurityLogs } from "@/lib/services/security";
import {
  getAccountStatement,
  type AccountStatementData,
} from "@/lib/services/statements";
import {
  serializeAccount,
  serializeAccounts,
  serializeBeneficiaries,
  serializeCards,
  serializeGoals,
  serializeNotifications,
  serializeProfile,
  serializeRecurringTransfers,
  serializeTransactions,
} from "@/lib/serialize";
import type {
  AccountForUi,
  BeneficiaryForUi,
  NotificationForUi,
  ProfileForUi,
  RecurringTransferForUi,
  SavingsGoalForUi,
  SecurityLogForUi,
  TransactionForUi,
  VirtualCardForUi,
} from "@/types/ui";

/**
 * Data loaders for Server Components.
 *
 * Everything the pages render comes from here, which is what keeps the cents →
 * decimals conversion in one place: the loaders read cent-precise rows and
 * return UI objects (see src/lib/serialize.ts).
 */

export interface DashboardUserData {
  id: string;
  email: string;
  name: string | null;
  accounts: AccountForUi[];
  transactions: TransactionForUi[];
  /** Movements in the chart window. The recent list above stays short. */
  chartTransactions: TransactionForUi[];
  /** Decimal currency units. */
  totalBalance: number;
  /** Total balance 30 days ago, derived from the net flow in that window. */
  previousBalance: number;
}

const DEFAULT_DASHBOARD_TRANSACTIONS = 10;
const BALANCE_COMPARISON_DAYS = 30;
const CHART_HISTORY_MONTHS = 6;

/** Start of the dashboard chart window. Month-end days clamp instead of overflowing. */
export function chartWindowStart(now: Date, months: number = CHART_HISTORY_MONTHS): Date {
  return addCalendarMonths(now, -months);
}

export async function getDashboardData(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<DashboardUserData | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: DEFAULT_DASHBOARD_TRANSACTIONS,
      },
    },
  });

  if (!user) return null;

  const chartSince = chartWindowStart(now);
  const chartRows = await prisma.transaction.findMany({
    where: { userId, createdAt: { gte: chartSince } },
    orderBy: { createdAt: "asc" },
  });

  const totalBalanceCents = user.accounts.reduce(
    (sum, account) => sum + account.balanceCents,
    0,
  );

  // "vs last month" is derived from real flows rather than assumed: the balance
  // a month ago is today's balance minus everything that moved since.
  const since = new Date(Date.now() - BALANCE_COMPARISON_DAYS * 24 * 60 * 60 * 1000);
  const [income, spending] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        ...incomeMovementWhere(userId),
        createdAt: { gte: since },
      },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: {
        ...spendingMovementWhere(userId),
        createdAt: { gte: since },
      },
      _sum: { amountCents: true },
    }),
  ]);
  const netCents = (income._sum.amountCents ?? 0) - (spending._sum.amountCents ?? 0);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accounts: serializeAccounts(user.accounts),
    transactions: serializeTransactions(user.transactions),
    chartTransactions: serializeTransactions(chartRows),
    totalBalance: fromCents(totalBalanceCents),
    previousBalance: fromCents(totalBalanceCents - netCents),
  };
}

export async function getUserByEmail(
  email: string,
  prisma: PrismaClient = defaultPrisma,
) {
  return prisma.user.findUnique({ where: { email } });
}

// ── Loaders for dashboard pages ─────────────────────────

export async function getAccountsForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<AccountForUi[]> {
  return serializeAccounts(await listAccounts(userId, prisma));
}

export async function getAccountDetailForUi(
  userId: string,
  accountId: string,
  transactionLimit = 50,
  prisma: PrismaClient = defaultPrisma,
): Promise<(AccountForUi & { transactions: TransactionForUi[] }) | null> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: transactionLimit,
      },
    },
  });
  if (!account) return null;

  const { transactions, ...rest } = account;
  return {
    ...serializeAccount(rest),
    transactions: serializeTransactions(transactions),
  };
}

export async function getGoalsForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<SavingsGoalForUi[]> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return serializeGoals(goals);
}

export async function getScheduledForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<RecurringTransferForUi[]> {
  return serializeRecurringTransfers(await listRecurringTransfers(userId, prisma));
}

export async function getCardsForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<VirtualCardForUi[]> {
  const cards = await prisma.virtualCard.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return serializeCards(cards);
}

export async function getBeneficiariesForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<BeneficiaryForUi[]> {
  const beneficiaries = await prisma.beneficiary.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return serializeBeneficiaries(beneficiaries);
}

export async function getNotificationsForUi(
  userId: string,
  take = 30,
  prisma: PrismaClient = defaultPrisma,
): Promise<NotificationForUi[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return serializeNotifications(notifications);
}

export async function getProfileForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<ProfileForUi | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const accounts = await listAccounts(userId, prisma);
  return serializeProfile(user, accounts);
}

export async function getBudgetsForUi(
  userId: string,
  prisma: PrismaClient = defaultPrisma,
): Promise<BudgetsSummary> {
  const result = await getBudgetsSummary(userId, prisma);
  if (!result.ok) {
    return {
      budgets: [],
      totalBudget: 0,
      totalBudgetCents: 0,
      totalSpent: 0,
      totalSpentCents: 0,
      totalRemaining: 0,
      totalRemainingCents: 0,
      overallPercentUsed: 0,
      month: new Date().toISOString().slice(0, 7),
    };
  }
  return result.data;
}

export async function getSecurityLogsForUi(
  userId: string,
  limit = 20,
  prisma: PrismaClient = defaultPrisma,
): Promise<SecurityLogForUi[]> {
  const result = await getSecurityLogs(userId, limit, prisma);
  if (!result.ok) return [];
  return result.data.map((entry) => ({
    id: entry.id,
    action: entry.action,
    details: entry.details,
    ipAddress: entry.ipAddress,
    createdAt: entry.createdAt.toISOString(),
  }));
}

export async function getStatementForUi(
  userId: string,
  accountId: string,
  year: number,
  month: number,
  prisma: PrismaClient = defaultPrisma,
): Promise<AccountStatementData | null> {
  const result = await getAccountStatement(userId, accountId, year, month, prisma);
  if (!result.ok) return null;
  return result.data;
}

export { getAnalyticsData };
export type { AnalyticsData } from "@/lib/services/analytics";
export type { BudgetsSummary } from "@/lib/services/budgets";
export type { AccountStatementData } from "@/lib/services/statements";
