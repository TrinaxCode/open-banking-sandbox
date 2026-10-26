/**
 * Analytics aggregation.
 *
 * Everything is aggregated in SQL (`groupBy` / `aggregate`) over a bounded
 * window, so the database returns a handful of rows instead of shipping the
 * whole ledger to the app. The window is six months — the same period the
 * monthly trend chart covers — and every query is served by the
 * `@@index([userId, createdAt])` index.
 *
 * Only the final sums cross into decimal currency units: the arithmetic itself
 * is exact integer cents.
 */

import type { PrismaClient } from "@prisma/client";
import { addCalendarMonths } from "@/lib/calendar";
import { incomeMovementWhere, spendingMovementWhere } from "@/lib/interest";
import { fromCents } from "@/lib/money";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const ANALYTICS_WINDOW_MONTHS = 6;

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
  windowMonths: number;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return addCalendarMonths(date, months);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** The `monthCount` month buckets ending with the month of `now`. */
export function buildMonthRanges(
  now: Date,
  monthCount: number,
): Array<{ key: string; gte: Date; lt: Date }> {
  const ranges: Array<{ key: string; gte: Date; lt: Date }> = [];
  for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
    const start = startOfMonth(addMonths(now, -offset));
    const end = startOfMonth(addMonths(start, 1));
    ranges.push({ key: monthKey(start), gte: start, lt: end });
  }
  return ranges;
}

export async function getAnalyticsData(
  userId: string,
  client: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<AnalyticsData> {
  const windowStart = startOfMonth(addMonths(now, -(ANALYTICS_WINDOW_MONTHS - 1)));
  const monthRanges = buildMonthRanges(now, ANALYTICS_WINDOW_MONTHS);

  const [categoryRows, incomeTotals, spendingTotals, monthly] = await Promise.all([
    client.transaction.groupBy({
      by: ["category"],
      where: {
        ...spendingMovementWhere(userId),
        createdAt: { gte: windowStart },
      },
      _sum: { amountCents: true },
    }),
    client.transaction.aggregate({
      where: {
        ...incomeMovementWhere(userId),
        createdAt: { gte: windowStart },
      },
      _sum: { amountCents: true },
    }),
    client.transaction.aggregate({
      where: {
        ...spendingMovementWhere(userId),
        createdAt: { gte: windowStart },
      },
      _sum: { amountCents: true },
    }),
    Promise.all(
      monthRanges.map(async (range) => {
        const [income, spending] = await Promise.all([
          client.transaction.aggregate({
            where: {
              ...incomeMovementWhere(userId),
              createdAt: { gte: range.gte, lt: range.lt },
            },
            _sum: { amountCents: true },
          }),
          client.transaction.aggregate({
            where: {
              ...spendingMovementWhere(userId),
              createdAt: { gte: range.gte, lt: range.lt },
            },
            _sum: { amountCents: true },
          }),
        ]);
        return {
          month: range.key,
          income: fromCents(income._sum.amountCents ?? 0),
          spending: fromCents(spending._sum.amountCents ?? 0),
        };
      }),
    ),
  ]);

  const spendingByCategory = categoryRows
    .map((row) => ({
      category: row.category || "other",
      total: fromCents(row._sum.amountCents ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    spendingByCategory,
    monthly,
    totalSpending: fromCents(spendingTotals._sum.amountCents ?? 0),
    totalIncome: fromCents(incomeTotals._sum.amountCents ?? 0),
    topCategory: spendingByCategory[0]?.category ?? null,
    windowMonths: ANALYTICS_WINDOW_MONTHS,
  };
}
