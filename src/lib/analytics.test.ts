// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestDb, seedTestUser } from "@/__tests__/db-helpers";
import { getAnalyticsData } from "./queries";

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
    const fs = await import("fs");
    fs.readdirSync(".")
      .filter((f) => f.startsWith("test-") && f.endsWith(".db"))
      .forEach((f) => {
        try { fs.unlinkSync(f); } catch {}
        try { fs.unlinkSync(f + "-journal"); } catch {}
      });
  });

  it("aggregates income and spending totals", async () => {
    // seedTestUser creates deposits of 5000 + 1000 (income) and a 100 withdrawal (spending)
    const data = await getAnalyticsData(userId, prisma);
    expect(data.totalIncome).toBe(6000);
    expect(data.totalSpending).toBe(100);
  });

  it("buckets spending by category", async () => {
    const data = await getAnalyticsData(userId, prisma);
    const categories = data.spendingByCategory.map((c) => c.category);
    // The 100 "Groceries" withdrawal has category "other" (seed helper doesn't set one)
    expect(data.spendingByCategory.length).toBeGreaterThan(0);
    expect(categories).toContain("other");
  });

  it("returns a top category", async () => {
    const data = await getAnalyticsData(userId, prisma);
    expect(data.topCategory).not.toBeNull();
  });
});
