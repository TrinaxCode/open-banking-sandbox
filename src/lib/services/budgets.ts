/**
 * Category Budgets Service.
 *
 * Enforces spending limits per category on a calendar-month basis.
 * Aggregates actual debits (withdrawals, transfers out, fees) within the
 * current calendar month against configured CategoryBudget limits.
 *
 * Adheres strictly to the money boundary:
 * - Database and service internal math work in integer cents.
 * - Converted to decimal currency units at the service boundary.
 */

import type { PrismaClient } from "@prisma/client";
import {
  SPENDING_TYPES,
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from "@/lib/domain";
import { INTEREST_CHARGE_CATEGORY, spendingMovementWhere } from "@/lib/interest";
import { fromCents } from "@/lib/money";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { fail, ok, type Result, toFailure } from "@/lib/services/result";
import { bookableCentsError } from "@/lib/validations";

export interface CategoryBudgetDetail {
  id: string;
  category: TransactionCategory;
  budgetLimit: number;
  budgetLimitCents: number;
  spent: number;
  spentCents: number;
  remaining: number;
  remainingCents: number;
  percentUsed: number;
  isOverBudget: boolean;
}

export interface BudgetsSummary {
  budgets: CategoryBudgetDetail[];
  totalBudget: number;
  totalBudgetCents: number;
  totalSpent: number;
  totalSpentCents: number;
  totalRemaining: number;
  totalRemainingCents: number;
  overallPercentUsed: number;
  month: string; // "YYYY-MM"
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export async function getBudgetsSummary(
  userId: string,
  client: PrismaClient = defaultPrisma,
  now: Date = new Date(),
): Promise<Result<BudgetsSummary>> {
  try {
    const monthStart = startOfMonth(now);
    const monthEnd = startOfNextMonth(now);
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [budgetRows, spendingRows] = await Promise.all([
      client.categoryBudget.findMany({
        where: { userId },
        orderBy: { category: "asc" },
      }),
      client.transaction.groupBy({
        by: ["category"],
        where: {
          ...spendingMovementWhere(userId),
          createdAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const spendingMap = new Map<string, number>();
    for (const row of spendingRows) {
      if (row.category) {
        spendingMap.set(row.category, row._sum.amountCents ?? 0);
      }
    }

    let totalBudgetCents = 0;
    let totalSpentCents = 0;

    const budgets: CategoryBudgetDetail[] = budgetRows.map((b) => {
      const spentCents = spendingMap.get(b.category) ?? 0;
      const budgetLimitCents = b.amountCents;
      const remainingCents = Math.max(0, budgetLimitCents - spentCents);
      const percentUsed =
        budgetLimitCents > 0 ? Math.round((spentCents / budgetLimitCents) * 100) : 0;

      totalBudgetCents += budgetLimitCents;
      totalSpentCents += spentCents;

      return {
        id: b.id,
        category: b.category as TransactionCategory,
        budgetLimit: fromCents(budgetLimitCents),
        budgetLimitCents,
        spent: fromCents(spentCents),
        spentCents,
        remaining: fromCents(remainingCents),
        remainingCents,
        percentUsed,
        isOverBudget: spentCents > budgetLimitCents,
      };
    });

    const totalRemainingCents = Math.max(0, totalBudgetCents - totalSpentCents);
    const overallPercentUsed =
      totalBudgetCents > 0 ? Math.round((totalSpentCents / totalBudgetCents) * 100) : 0;

    return ok({
      budgets,
      totalBudget: fromCents(totalBudgetCents),
      totalBudgetCents,
      totalSpent: fromCents(totalSpentCents),
      totalSpentCents,
      totalRemaining: fromCents(totalRemainingCents),
      totalRemainingCents,
      overallPercentUsed,
      month: monthStr,
    });
  } catch (err) {
    return toFailure(err, "Failed to load budget summary");
  }
}

export async function setCategoryBudget(
  userId: string,
  category: string,
  amountCents: number,
  client: PrismaClient = defaultPrisma,
): Promise<Result<CategoryBudgetDetail>> {
  try {
    if (!TRANSACTION_CATEGORIES.includes(category as TransactionCategory)) {
      return fail("validation_error", "Invalid category for budget");
    }
    if (category === "income") {
      return fail("validation_error", "Income cannot have an expenditure budget");
    }
    const invalidAmount = bookableCentsError(amountCents);
    if (invalidAmount) {
      return fail("validation_error", invalidAmount);
    }

    const budget = await client.categoryBudget.upsert({
      where: {
        userId_category: {
          userId,
          category,
        },
      },
      create: {
        userId,
        category,
        amountCents,
      },
      update: {
        amountCents,
      },
    });

    // Optionally record security audit event
    await client.securityLog
      .create({
        data: {
          userId,
          action: "budget_set",
          details: `Set monthly budget of $${fromCents(amountCents)} for ${category}`,
        },
      })
      .catch(() => {});

    // Compute current spent in this calendar month
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = startOfNextMonth(now);

    const spending = await client.transaction.aggregate({
      where: {
        userId,
        category,
        type: {
          in:
            category === INTEREST_CHARGE_CATEGORY
              ? [...SPENDING_TYPES, "interest"]
              : [...SPENDING_TYPES],
        },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amountCents: true },
    });

    const spentCents = spending._sum.amountCents ?? 0;
    const remainingCents = Math.max(0, amountCents - spentCents);
    const percentUsed = Math.round((spentCents / amountCents) * 100);

    return ok({
      id: budget.id,
      category: budget.category as TransactionCategory,
      budgetLimit: fromCents(amountCents),
      budgetLimitCents: amountCents,
      spent: fromCents(spentCents),
      spentCents,
      remaining: fromCents(remainingCents),
      remainingCents,
      percentUsed,
      isOverBudget: spentCents > amountCents,
    });
  } catch (err) {
    return toFailure(err, "Failed to set category budget");
  }
}

export async function deleteCategoryBudget(
  userId: string,
  category: string,
  client: PrismaClient = defaultPrisma,
): Promise<Result<{ category: string }>> {
  try {
    await client.categoryBudget.deleteMany({
      where: { userId, category },
    });
    return ok({ category });
  } catch (err) {
    return toFailure(err, "Failed to delete category budget");
  }
}
