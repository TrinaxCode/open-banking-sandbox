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
  buildTransactionsCsv,
  buildTransactionWhere,
  countTransactionsByType,
  listTransactionsPage,
} from "@/lib/services/transactions";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("transaction history service", () => {
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

  async function addTransaction(data: {
    type?: string;
    amountCents: number;
    category?: string;
    description?: string;
    daysAgo?: number;
  }) {
    return prisma.transaction.create({
      data: {
        userId: user.user.id,
        accountId: user.checkingAccountId,
        type: data.type ?? "withdrawal",
        amountCents: data.amountCents,
        category: data.category ?? "other",
        description: data.description ?? "",
        createdAt: new Date(Date.now() - (data.daysAgo ?? 0) * DAY_MS),
      },
    });
  }

  describe("buildTransactionWhere", () => {
    it("always scopes to the user", () => {
      expect(buildTransactionWhere("u1")).toEqual({ userId: "u1" });
    });

    it("maps filters onto indexed predicates", () => {
      const from = new Date("2026-01-01T00:00:00Z");
      const to = new Date("2026-01-31T00:00:00Z");
      const where = buildTransactionWhere("u1", {
        type: "withdrawal",
        category: "food",
        q: "coffee",
        from,
        to,
      });

      expect(where.type).toBe("withdrawal");
      expect(where.category).toBe("food");
      expect(where.OR).toHaveLength(2);
      const createdAt = where.createdAt as { gte: Date; lt: Date };
      expect(createdAt.gte.getHours()).toBe(0);
      expect(createdAt.gte.getTime()).toBeLessThanOrEqual(from.getTime());
      // `to` is inclusive: the upper bound lands after the timestamp and within
      // the same local day (the exact offset depends on the machine timezone).
      expect(createdAt.lt.getTime()).toBeGreaterThan(to.getTime());
      expect(createdAt.lt.getTime() - to.getTime()).toBeLessThanOrEqual(DAY_MS);
    });
  });

  describe("listTransactionsPage", () => {
    it("returns the newest first with totals per page", async () => {
      await addTransaction({ amountCents: 1_000, description: "oldest", daysAgo: 3 });
      await addTransaction({ amountCents: 2_000, description: "middle", daysAgo: 2 });

      const page = await listTransactionsPage({ userId: user.user.id, limit: 2 }, prisma);

      expect(page.total).toBe(5); // 3 seeded + 2 added
      expect(page.pageCount).toBe(3);
      expect(page.page).toBe(1);
      expect(page.limit).toBe(2);

      const timestamps = page.items.map((item) => new Date(item.createdAt).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it("puts the most recent transaction first", async () => {
      const newest = await addTransaction({
        amountCents: 1,
        description: "brand new",
        daysAgo: -1, // a day ahead, so it wins regardless of clock granularity
      });

      const page = await listTransactionsPage({ userId: user.user.id, limit: 3 }, prisma);
      expect(page.items[0]?.id).toBe(newest.id);
    });

    it("walks pages without repeating rows", async () => {
      const first = await listTransactionsPage(
        { userId: user.user.id, page: 1, limit: 2 },
        prisma,
      );
      const second = await listTransactionsPage(
        { userId: user.user.id, page: 2, limit: 2 },
        prisma,
      );

      const firstIds = first.items.map((i) => i.id);
      const secondIds = second.items.map((i) => i.id);
      expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
      expect(second.page).toBe(2);
    });

    it("clamps an out-of-range page instead of returning nothing", async () => {
      const page = await listTransactionsPage(
        { userId: user.user.id, page: 99, limit: 2 },
        prisma,
      );
      expect(page.page).toBe(page.pageCount);
      expect(page.items.length).toBeGreaterThan(0);
    });

    it("applies filters", async () => {
      const page = await listTransactionsPage(
        { userId: user.user.id, filters: { type: "withdrawal" } },
        prisma,
      );
      expect(page.items.every((i) => i.type === "withdrawal")).toBe(true);
      expect(page.total).toBe(1);
    });

    it("searches descriptions case-insensitively", async () => {
      const page = await listTransactionsPage(
        { userId: user.user.id, filters: { q: "groc" } },
        prisma,
      );
      expect(page.total).toBe(1);
      expect(page.items[0]?.description).toBe("Groceries");
    });

    it("respects the requested page size limits", async () => {
      const page = await listTransactionsPage(
        { userId: user.user.id, limit: 5000 },
        prisma,
      );
      expect(page.limit).toBe(100); // MAX_PAGE_SIZE
    });
  });

  describe("countTransactionsByType", () => {
    it("counts per type and totals everything as 'all'", async () => {
      await addTransaction({ type: "fee", amountCents: 100, category: "bills" });

      const counts = await countTransactionsByType(user.user.id, {}, prisma);

      expect(counts.all).toBe(4);
      expect(counts.deposit).toBe(2);
      expect(counts.withdrawal).toBe(1);
      expect(counts.fee).toBe(1);
    });

    it("ignores the type filter so the pills keep showing real totals", async () => {
      const counts = await countTransactionsByType(
        user.user.id,
        { type: "withdrawal" },
        prisma,
      );
      expect(counts.all).toBe(3);
      expect(counts.deposit).toBe(2);
    });
  });

  describe("buildTransactionsCsv", () => {
    it("exports decimal amounts, not cents", async () => {
      await addTransaction({ amountCents: 123_456, description: "Big one" });

      const { csv, count } = await buildTransactionsCsv(user.user.id, {}, prisma);

      expect(count).toBe(4);
      expect(csv.split("\n")[0]).toBe(
        "Date,Type,Category,Description,Reference,Amount,Status",
      );
      expect(csv).toContain("1234.56");
      expect(csv).toContain("Big one");
    });
  });
});
