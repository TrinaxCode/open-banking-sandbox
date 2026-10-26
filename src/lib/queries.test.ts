// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cleanupTestDbs, createTestDb, seedTestUser } from "@/__tests__/db-helpers";
import {
  getAccountsForUi,
  getAccountDetailForUi,
  getBeneficiariesForUi,
  getBudgetsForUi,
  getCardsForUi,
  chartWindowStart,
  getDashboardData,
  getGoalsForUi,
  getNotificationsForUi,
  getProfileForUi,
  getScheduledForUi,
  getSecurityLogsForUi,
  getStatementForUi,
  getUserByEmail,
} from "./queries";

describe("queries", () => {
  let prisma: PrismaClient;
  let testData: Awaited<ReturnType<typeof seedTestUser>>;

  beforeAll(async () => {
    prisma = await createTestDb();
    testData = await seedTestUser(prisma);
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
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

    it("caps the recent list and keeps older rows for the chart", async () => {
      const created = [];
      try {
        for (let i = 0; i < 12; i++) {
          created.push(
            await prisma.transaction.create({
              data: {
                userId: testData.user.id,
                accountId: testData.checkingAccountId,
                type: "deposit",
                amountCents: 100,
                description: `chart row ${i}`,
                createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
              },
            }),
          );
        }

        const data = await getDashboardData(testData.user.id, prisma);

        expect(data?.transactions).toHaveLength(10);
        expect(data?.chartTransactions.length).toBeGreaterThan(10);
      } finally {
        await prisma.transaction.deleteMany({
          where: { id: { in: created.map((row) => row.id) } },
        });
      }
    });

    it("should calculate total balance from all accounts", async () => {
      const data = await getDashboardData(testData.user.id, prisma);
      expect(data?.totalBalance).toBe(15000); // 5000 + 10000
    });

    it("should return null for non-existent user", async () => {
      const data = await getDashboardData("non-existent-id", prisma);
      expect(data).toBeNull();
    });

    it("clamps the chart window on the 31st so February movements stay visible", async () => {
      const now = new Date(2026, 7, 31, 15, 45, 0);
      expect(chartWindowStart(now)).toEqual(new Date(2026, 1, 28, 15, 45, 0));

      const included = await prisma.transaction.create({
        data: {
          userId: testData.user.id,
          accountId: testData.checkingAccountId,
          type: "deposit",
          amountCents: 100,
          description: "inside chart window",
          createdAt: new Date(2026, 1, 28, 15, 45, 0),
        },
      });
      const excluded = await prisma.transaction.create({
        data: {
          userId: testData.user.id,
          accountId: testData.checkingAccountId,
          type: "deposit",
          amountCents: 100,
          description: "before chart window",
          createdAt: new Date(2026, 1, 28, 15, 44, 59),
        },
      });

      try {
        const data = await getDashboardData(testData.user.id, prisma, now);
        const ids = data?.chartTransactions.map((row) => row.id) ?? [];
        expect(ids).toContain(included.id);
        expect(ids).not.toContain(excluded.id);
      } finally {
        await prisma.transaction.deleteMany({
          where: { id: { in: [included.id, excluded.id] } },
        });
      }
    });

    it("treats a credit-interest charge as money that left", async () => {
      const credit = await prisma.account.create({
        data: {
          userId: testData.user.id,
          type: "credit",
          number: "CRD-INT001",
          balanceCents: -100_100,
        },
      });
      const charge = await prisma.transaction.create({
        data: {
          userId: testData.user.id,
          accountId: credit.id,
          type: "interest",
          amountCents: 100,
          category: "bills",
          description: "Interest charged",
        },
      });

      try {
        const data = await getDashboardData(testData.user.id, prisma);
        // 1_399_900 cents on the books. Seed flows are +600_000 / -10_000, and
        // the charge is another -100, so last month was 810_000 cents.
        expect(data?.totalBalance).toBe(13999);
        expect(data?.previousBalance).toBe(8100);
      } finally {
        await prisma.transaction.delete({ where: { id: charge.id } });
        await prisma.account.delete({ where: { id: credit.id } });
      }
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

  describe("getAccountsForUi", () => {
    it("returns formatted accounts with decimal balances", async () => {
      const accounts = await getAccountsForUi(testData.user.id, prisma);
      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toHaveProperty("balance");
      expect(typeof accounts[0]!.balance).toBe("number");
    });
  });

  describe("getAccountDetailForUi", () => {
    it("returns account detail with attached transactions", async () => {
      const detail = await getAccountDetailForUi(
        testData.user.id,
        testData.checkingAccountId,
        10,
        prisma,
      );
      expect(detail).not.toBeNull();
      expect(detail?.id).toBe(testData.checkingAccountId);
      expect(detail?.transactions.length).toBeGreaterThanOrEqual(1);
      expect(detail?.transactions[0]).toHaveProperty("amount");
      expect(typeof detail?.transactions[0]!.amount).toBe("number");
    });

    it("returns null when account does not belong to user or does not exist", async () => {
      const detail = await getAccountDetailForUi(
        testData.user.id,
        "non-existent-account",
        10,
        prisma,
      );
      expect(detail).toBeNull();
    });
  });

  describe("getGoalsForUi", () => {
    it("loads and serializes savings goals", async () => {
      await prisma.savingsGoal.create({
        data: {
          userId: testData.user.id,
          accountId: testData.savingsAccountId,
          name: "Trip Fund",
          targetAmountCents: 50_000,
          currentAmountCents: 10_000,
        },
      });

      const goals = await getGoalsForUi(testData.user.id, prisma);
      expect(goals.length).toBeGreaterThanOrEqual(1);
      const trip = goals.find((g) => g.name === "Trip Fund");
      expect(trip?.targetAmount).toBe(500);
      expect(trip?.currentAmount).toBe(100);
      expect(trip?.color).toBe("emerald");
    });
  });

  describe("getScheduledForUi", () => {
    it("loads and serializes scheduled transfers", async () => {
      await prisma.recurringTransfer.create({
        data: {
          userId: testData.user.id,
          fromAccountId: testData.checkingAccountId,
          targetAccountNumber: testData.savingsAccountNumber,
          amountCents: 2_500,
          frequency: "monthly",
          nextRunAt: new Date(),
        },
      });

      const list = await getScheduledForUi(testData.user.id, prisma);
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0]!.amount).toBe(25);
      expect(list[0]!.frequency).toBe("monthly");
    });
  });

  describe("getCardsForUi", () => {
    it("loads and serializes virtual cards", async () => {
      await prisma.virtualCard.create({
        data: {
          userId: testData.user.id,
          cardNumber: "4000123456789010",
          cardHolder: "Test User",
          expiryDate: "12/28",
          cvv: "789",
        },
      });

      const cards = await getCardsForUi(testData.user.id, prisma);
      expect(cards.length).toBeGreaterThanOrEqual(1);
      expect(cards[0]!.cardNumber).toBe("4000123456789010");
    });
  });

  describe("getBeneficiariesForUi", () => {
    it("loads and serializes beneficiaries", async () => {
      await prisma.beneficiary.create({
        data: {
          userId: testData.user.id,
          name: "Alice Partner",
          accountNumber: "CHK-ALICE1",
          nickname: "Alice",
        },
      });

      const list = await getBeneficiariesForUi(testData.user.id, prisma);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const alice = list.find((b) => b.accountNumber === "CHK-ALICE1");
      expect(alice?.name).toBe("Alice Partner");
      expect(alice?.nickname).toBe("Alice");
    });
  });

  describe("getNotificationsForUi", () => {
    it("loads notifications ordered by recent date", async () => {
      await prisma.notification.create({
        data: {
          userId: testData.user.id,
          type: "info",
          title: "System Update",
          body: "Welcome to TrinaxBank",
        },
      });

      const notifications = await getNotificationsForUi(testData.user.id, 10, prisma);
      expect(notifications.length).toBeGreaterThanOrEqual(1);
      expect(notifications[0]!.title).toBe("System Update");
      expect(notifications[0]!.body).toBe("Welcome to TrinaxBank");
    });
  });

  describe("getProfileForUi", () => {
    it("returns serialized profile with user accounts summary", async () => {
      const profile = await getProfileForUi(testData.user.id, prisma);
      expect(profile).not.toBeNull();
      expect(profile?.email).toBe("test@example.com");
      expect(profile?.name).toBe("Test User");
      expect(profile?.accountCount).toBe(2);
      expect(profile?.totalBalance).toBe(15000);
    });

    it("returns null for non-existent user", async () => {
      const profile = await getProfileForUi("ghost-user", prisma);
      expect(profile).toBeNull();
    });
  });

  describe("getBudgetsForUi", () => {
    it("returns budget summary structure", async () => {
      const summary = await getBudgetsForUi(testData.user.id, prisma);
      expect(summary).toBeDefined();
      expect(summary).toHaveProperty("totalBudget");
      expect(summary).toHaveProperty("totalSpent");
      expect(summary).toHaveProperty("budgets");
    });
  });

  describe("getSecurityLogsForUi", () => {
    it("returns formatted security logs", async () => {
      await prisma.securityLog.create({
        data: {
          userId: testData.user.id,
          action: "login",
          details: "Session started",
          ipAddress: "127.0.0.1",
        },
      });

      const logs = await getSecurityLogsForUi(testData.user.id, 5, prisma);
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0]!.action).toBe("login");
      expect(logs[0]!.ipAddress).toBe("127.0.0.1");
    });
  });

  describe("getStatementForUi", () => {
    it("generates an account statement", async () => {
      const now = new Date();
      const statement = await getStatementForUi(
        testData.user.id,
        testData.checkingAccountId,
        now.getFullYear(),
        now.getMonth() + 1,
        prisma,
      );
      expect(statement).not.toBeNull();
      expect(statement?.account.id).toBe(testData.checkingAccountId);
      expect(statement?.period.year).toBe(now.getFullYear());
    });

    it("returns null if account does not exist", async () => {
      const statement = await getStatementForUi(
        testData.user.id,
        "invalid-acc",
        2026,
        1,
        prisma,
      );
      expect(statement).toBeNull();
    });
  });
});
