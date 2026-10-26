// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type TestUser,
} from "@/__tests__/db-helpers";
import {
  createAccountForUser,
  deleteAccountForUser,
  getAccountForUser,
  listAccounts,
  updateAccountNickname,
} from "@/lib/services/accounts";
import { DEFAULT_CREDIT_LIMIT_CENTS } from "@/lib/domain";

describe("accounts service", () => {
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

  describe("createAccountForUser", () => {
    it("opens a checking account with no rate and no credit line", async () => {
      const result = await createAccountForUser(user.user.id, "checking", prisma);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.number).toMatch(/^CHK-[A-F0-9]{6}$/);
      expect(result.data.balanceCents).toBe(0);
      expect(result.data.interestRate).toBe(0);
      expect(result.data.creditLimitCents).toBeNull();
      expect(result.data.dueDate).toBeNull();
    });

    it("gives savings accounts their interest rate", async () => {
      const result = await createAccountForUser(user.user.id, "savings", prisma);

      expect(result.ok && result.data.interestRate).toBe(3.5);
      expect(result.ok && result.data.number.startsWith("SAV-")).toBe(true);
    });

    it("gives credit accounts a limit, a rate and a due date", async () => {
      const result = await createAccountForUser(user.user.id, "credit", prisma);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.creditLimitCents).toBe(DEFAULT_CREDIT_LIMIT_CENTS);
      expect(result.data.interestRate).toBe(19.99);
      expect(result.data.dueDate).toBe("15");
    });

    it("never reuses an account number", async () => {
      const numbers = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const result = await createAccountForUser(user.user.id, "checking", prisma);
        if (result.ok) numbers.add(result.data.number);
      }
      expect(numbers.size).toBe(5);
    });
  });

  describe("listAccounts", () => {
    it("returns the user's accounts oldest first", async () => {
      const accounts = await listAccounts(user.user.id, prisma);
      expect(accounts.map((a) => a.type)).toEqual(["checking", "savings"]);
    });

    it("does not leak other users' accounts", async () => {
      const peer = await seedPeerUser(prisma);
      const accounts = await listAccounts(peer.user.id, prisma);
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.id).toBe(peer.account.id);
    });
  });

  describe("getAccountForUser", () => {
    it("scopes to the owner", async () => {
      const peer = await seedPeerUser(prisma);
      expect(await getAccountForUser(user.user.id, peer.account.id, prisma)).toBeNull();
      expect(
        await getAccountForUser(peer.user.id, peer.account.id, prisma),
      ).not.toBeNull();
    });
  });

  describe("updateAccountNickname", () => {
    it("sets and clears the nickname", async () => {
      const set = await updateAccountNickname(
        user.user.id,
        user.checkingAccountId,
        "  Everyday  ",
        prisma,
      );
      expect(set.ok).toBe(true);

      let account = await prisma.account.findUniqueOrThrow({
        where: { id: user.checkingAccountId },
      });
      expect(account.nickname).toBe("Everyday");

      await updateAccountNickname(user.user.id, user.checkingAccountId, "", prisma);
      account = await prisma.account.findUniqueOrThrow({
        where: { id: user.checkingAccountId },
      });
      expect(account.nickname).toBeNull();
    });

    it("refuses an account owned by another user", async () => {
      const peer = await seedPeerUser(prisma);
      const result = await updateAccountNickname(
        user.user.id,
        peer.account.id,
        "Mine now",
        prisma,
      );
      expect(result).toMatchObject({ ok: false, code: "not_found" });
    });
  });

  describe("deleteAccountForUser", () => {
    it("refuses to delete an account that still holds money", async () => {
      const result = await deleteAccountForUser(
        user.user.id,
        user.checkingAccountId,
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "conflict" });
      expect(
        await prisma.account.findUnique({ where: { id: user.checkingAccountId } }),
      ).not.toBeNull();
    });

    it("deletes an empty account", async () => {
      const created = await createAccountForUser(user.user.id, "checking", prisma);
      if (!created.ok) throw new Error("account not created");

      const result = await deleteAccountForUser(user.user.id, created.data.id, prisma);

      expect(result.ok).toBe(true);
      expect(
        await prisma.account.findUnique({ where: { id: created.data.id } }),
      ).toBeNull();
    });

    it("refuses an account owned by another user", async () => {
      const peer = await seedPeerUser(prisma);
      const result = await deleteAccountForUser(user.user.id, peer.account.id, prisma);
      expect(result).toMatchObject({ ok: false, code: "not_found" });
    });

    it("refuses to delete an empty account while a goal still holds funds", async () => {
      const created = await createAccountForUser(user.user.id, "checking", prisma);
      if (!created.ok) throw new Error("account not created");

      const goal = await prisma.savingsGoal.create({
        data: {
          userId: user.user.id,
          accountId: created.data.id,
          name: "Emergency",
          targetAmountCents: 10_000,
          currentAmountCents: 4_000,
        },
      });

      const result = await deleteAccountForUser(user.user.id, created.data.id, prisma);

      expect(result).toMatchObject({ ok: false, code: "conflict" });
      expect(
        await prisma.account.findUnique({ where: { id: created.data.id } }),
      ).not.toBeNull();
      expect(
        await prisma.savingsGoal.findUnique({ where: { id: goal.id } }),
      ).not.toBeNull();
      expect(
        (await prisma.savingsGoal.findUnique({ where: { id: goal.id } }))
          ?.currentAmountCents,
      ).toBe(4_000);
    });
  });
});
