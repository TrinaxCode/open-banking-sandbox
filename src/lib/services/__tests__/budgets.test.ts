// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedTestUser,
  type TestUser,
} from "@/__tests__/db-helpers";
import {
  getBudgetsSummary,
  setCategoryBudget,
  deleteCategoryBudget,
} from "@/lib/services/budgets";

describe("budgets service", () => {
  let prisma: PrismaClient;
  let user: TestUser;

  beforeAll(async () => {
    prisma = await createTestDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  beforeEach(async () => {
    user = await seedTestUser(prisma);
  });

  describe("setCategoryBudget", () => {
    it("sets a new budget for a valid category", async () => {
      const result = await setCategoryBudget(user.user.id, "food", 50000, prisma);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.category).toBe("food");
      expect(result.data.budgetLimit).toBe(500);
      expect(result.data.budgetLimitCents).toBe(50000);
      expect(result.data.spent).toBe(0);
      expect(result.data.remaining).toBe(500);
      expect(result.data.percentUsed).toBe(0);
      expect(result.data.isOverBudget).toBe(false);
    });

    it("upserts an existing budget with a new limit", async () => {
      await setCategoryBudget(user.user.id, "food", 40000, prisma);
      const updateResult = await setCategoryBudget(user.user.id, "food", 65000, prisma);

      expect(updateResult.ok).toBe(true);
      if (!updateResult.ok) return;
      expect(updateResult.data.budgetLimit).toBe(650);
      expect(updateResult.data.budgetLimitCents).toBe(65000);
    });

    it("rejects an invalid category", async () => {
      const result = await setCategoryBudget(
        user.user.id,
        "crypto_gambling",
        10000,
        prisma,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("validation_error");
    });

    it("rejects income category for spending budget", async () => {
      const result = await setCategoryBudget(user.user.id, "income", 10000, prisma);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("validation_error");
    });

    it("rejects zero or negative budget amounts", async () => {
      const zeroResult = await setCategoryBudget(user.user.id, "food", 0, prisma);
      expect(zeroResult.ok).toBe(false);

      const negResult = await setCategoryBudget(user.user.id, "food", -500, prisma);
      expect(negResult.ok).toBe(false);
    });

    it("counts a credit-interest charge against the bills budget", async () => {
      await setCategoryBudget(user.user.id, "bills", 10_000, prisma);
      await prisma.transaction.create({
        data: {
          userId: user.user.id,
          accountId: user.checkingAccountId,
          type: "interest",
          amountCents: 2_500,
          category: "bills",
          description: "Interest charged",
        },
      });

      const result = await getBudgetsSummary(user.user.id, prisma);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const bills = result.data.budgets.find((budget) => budget.category === "bills");
      expect(bills?.spentCents).toBe(2_500);
    });

    it("rejects a fractional or above-cap budget before writing", async () => {
      const fractional = await setCategoryBudget(user.user.id, "food", 10.5, prisma);
      const tooBig = await setCategoryBudget(user.user.id, "food", 1_000_000_000, prisma);

      expect(fractional).toMatchObject({ ok: false, code: "validation_error" });
      expect(tooBig).toMatchObject({ ok: false, code: "validation_error" });
      expect(await prisma.categoryBudget.count({ where: { userId: user.user.id } })).toBe(
        0,
      );
    });
  });

  describe("getBudgetsSummary", () => {
    it("returns zero summary when no budgets are defined", async () => {
      const result = await getBudgetsSummary(user.user.id, prisma);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.budgets).toHaveLength(0);
      expect(result.data.totalBudget).toBe(0);
      expect(result.data.totalSpent).toBe(0);
      expect(result.data.overallPercentUsed).toBe(0);
    });

    it("calculates spent, remaining and over-budget correctly from transactions in the current month", async () => {
      await setCategoryBudget(user.user.id, "food", 10000, prisma); // $100
      await setCategoryBudget(user.user.id, "transport", 5000, prisma); // $50

      const now = new Date();

      // Transaction within current month
      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 6000, // $60
          type: "withdrawal",
          category: "food",
          description: "Restaurant dinner",
          createdAt: now,
        },
      });

      // Transaction from previous month (should NOT count toward this month's budget)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 8000,
          type: "withdrawal",
          category: "food",
          description: "Old meal",
          createdAt: lastMonth,
        },
      });

      const summaryResult = await getBudgetsSummary(user.user.id, prisma, now);
      expect(summaryResult.ok).toBe(true);
      if (!summaryResult.ok) return;

      expect(summaryResult.data.totalBudget).toBe(150); // $100 + $50
      expect(summaryResult.data.totalSpent).toBe(60); // only $60 from current month
      expect(summaryResult.data.totalRemaining).toBe(90);
      expect(summaryResult.data.overallPercentUsed).toBe(40); // 60 / 150 = 40%

      const foodBudget = summaryResult.data.budgets.find((b) => b.category === "food");
      expect(foodBudget).toBeDefined();
      expect(foodBudget?.spent).toBe(60);
      expect(foodBudget?.remaining).toBe(40);
      expect(foodBudget?.percentUsed).toBe(60);
      expect(foodBudget?.isOverBudget).toBe(false);

      const transportBudget = summaryResult.data.budgets.find(
        (b) => b.category === "transport",
      );
      expect(transportBudget?.spent).toBe(0);
      expect(transportBudget?.remaining).toBe(50);
      expect(transportBudget?.percentUsed).toBe(0);
    });

    it("flags category as over-budget when spent exceeds limit", async () => {
      await setCategoryBudget(user.user.id, "entertainment", 2000, prisma); // $20
      const now = new Date();

      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 3500, // $35 spent
          type: "transfer_out",
          category: "entertainment",
          description: "Concert ticket",
          createdAt: now,
        },
      });

      const result = await getBudgetsSummary(user.user.id, prisma, now);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const ent = result.data.budgets.find((b) => b.category === "entertainment");
      expect(ent?.isOverBudget).toBe(true);
      expect(ent?.spent).toBe(35);
      expect(ent?.remaining).toBe(0);
      expect(ent?.percentUsed).toBe(175);
    });
  });

  describe("deleteCategoryBudget", () => {
    it("deletes a configured category budget", async () => {
      await setCategoryBudget(user.user.id, "shopping", 15000, prisma);

      const deleteRes = await deleteCategoryBudget(user.user.id, "shopping", prisma);
      expect(deleteRes.ok).toBe(true);

      const summary = await getBudgetsSummary(user.user.id, prisma);
      expect(
        summary.ok && summary.data.budgets.find((b) => b.category === "shopping"),
      ).toBeUndefined();
    });
  });
});
