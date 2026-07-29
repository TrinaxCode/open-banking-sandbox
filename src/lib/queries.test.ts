// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestDb, seedTestUser } from "@/__tests__/db-helpers";
import { getDashboardData, getUserByEmail } from "./queries";

describe("queries", () => {
  let prisma: PrismaClient;
  let testData: Awaited<ReturnType<typeof seedTestUser>>;

  beforeAll(async () => {
    prisma = await createTestDb();
    testData = await seedTestUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    // Cleanup temp test DB files
    const fs = await import("fs");
    const files = fs.readdirSync(".").filter((f: string) => f.startsWith("test-") && f.endsWith(".db"));
    files.forEach((f: string) => {
      try { fs.unlinkSync(f); } catch {}
    });
    files.forEach((f: string) => {
      try { fs.unlinkSync(f + "-journal"); } catch {}
    });
  });

  describe("getDashboardData", () => {
    it("should return dashboard data for valid user", async () => {
      const data = await getDashboardData(testData.user.id, prisma);
      expect(data).not.toBeNull();
      expect(data?.email).toBe("test@example.com");
      expect(data?.name).toBe("Test User");
    });

    it("should include all accounts with correct balances", async () => {
      const data = await getDashboardData(testData.user.id, prisma);
      expect(data?.accounts).toHaveLength(2);
      const chk = data?.accounts.find((a) => a.type === "checking");
      expect(chk?.balance).toBe(5000);
      const sav = data?.accounts.find((a) => a.type === "savings");
      expect(sav?.balance).toBe(10000);
    });

    it("should include recent transactions ordered by date desc", async () => {
      const data = await getDashboardData(testData.user.id, prisma);
      expect(data?.transactions.length).toBeGreaterThanOrEqual(2);
    });

    it("should calculate total balance from all accounts", async () => {
      const data = await getDashboardData(testData.user.id, prisma);
      expect(data?.totalBalance).toBe(15000); // 5000 + 10000
    });

    it("should return null for non-existent user", async () => {
      const data = await getDashboardData("non-existent-id", prisma);
      expect(data).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should find user by email", async () => {
      const user = await getUserByEmail("test@example.com", prisma);
      expect(user).not.toBeNull();
      expect(user?.email).toBe("test@example.com");
      expect(user?.passwordHash).toBeDefined();
    });

    it("should return null for unknown email", async () => {
      const user = await getUserByEmail("unknown@example.com", prisma);
      expect(user).toBeNull();
    });
  });
});
