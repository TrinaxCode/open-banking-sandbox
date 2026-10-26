// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cleanupTestDbs, createTestDb, seedTestUser } from "@/__tests__/db-helpers";
import { buildMonthRanges, getAnalyticsData } from "./services/analytics";

describe("buildMonthRanges", () => {
  it("keeps six consecutive months and the window start when today is the 31st", () => {
    const ranges = buildMonthRanges(new Date(2026, 2, 31), 6);

    expect(ranges.map((range) => range.key)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
    expect(ranges[0]?.gte).toEqual(new Date(2025, 9, 1));
    expect(ranges[5]?.lt).toEqual(new Date(2026, 3, 1));
    for (const range of ranges) {
      expect(range.lt).toEqual(
        new Date(range.gte.getFullYear(), range.gte.getMonth() + 1, 1),
      );
    }
  });

  it("starts a July 31 window in February", () => {
    const ranges = buildMonthRanges(new Date(2026, 6, 31), 6);

    expect(ranges.map((range) => range.key)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
    expect(ranges[0]?.gte).toEqual(new Date(2026, 1, 1));
  });
});

describe("getAnalyticsData", () => {
  let prisma: PrismaClient;
  let userId: string;

  beforeAll(async () => {
    prisma = await createTestDb();
    const data = await seedTestUser(prisma);
    userId = data.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  it("aggregates income and spending totals in SQL", async () => {
    // seedTestUser creates deposits of $5,000 + $1,000 (income) and a $100
    // withdrawal (spending).
    const data = await getAnalyticsData(userId, prisma);
    expect(data.totalIncome).toBe(6000);
    expect(data.totalSpending).toBe(100);
  });

  it("buckets spending by category", async () => {
    const data = await getAnalyticsData(userId, prisma);
    const categories = data.spendingByCategory.map((c) => c.category);
    expect(data.spendingByCategory.length).toBeGreaterThan(0);
    expect(categories).toContain("other");
  });

  it("returns a top category and the window size", async () => {
    const data = await getAnalyticsData(userId, prisma);
    expect(data.topCategory).not.toBeNull();
    expect(data.windowMonths).toBe(6);
    expect(data.monthly).toHaveLength(6);
  });

  it("ignores transactions older than the window", async () => {
    const stale = new Date();
    stale.setMonth(stale.getMonth() - 9);
    await prisma.transaction.create({
      data: {
        userId,
        type: "withdrawal",
        amountCents: 999_999,
        description: "Old spending",
        category: "other",
        createdAt: stale,
      },
    });

    const data = await getAnalyticsData(userId, prisma);
    expect(data.totalSpending).toBe(100);
  });

  it("counts a credit-interest charge as spending, not income", async () => {
    await prisma.transaction.create({
      data: {
        userId,
        type: "interest",
        amountCents: 500,
        description: "Interest charged (1 day)",
        category: "bills",
      },
    });

    const data = await getAnalyticsData(userId, prisma);
    expect(data.totalIncome).toBe(6000);
    expect(data.totalSpending).toBe(105);
  });
});
