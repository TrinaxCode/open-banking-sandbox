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
import { runDueJobs } from "@/lib/jobs";
import { transferExternal, transferInternal } from "@/lib/services/payments";
import {
  getAccountStatement,
  type AccountStatementData,
} from "@/lib/services/statements";

function periodOf(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Opening plus the statement's own credit/debit marks. */
function openingPlusLines(statement: AccountStatementData): number {
  const signed = statement.transactions.reduce(
    (sum, line) => sum + (line.isCredit ? line.amountCents : -line.amountCents),
    0,
  );
  return statement.summary.openingBalanceCents + signed;
}

describe("statements service", () => {
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

  describe("validation & access control", () => {
    it("rejects invalid month numbers", async () => {
      const res0 = await getAccountStatement(
        user.user.id,
        user.checkingAccountId,
        2026,
        0,
        prisma,
      );
      expect(res0.ok).toBe(false);
      if (!res0.ok) expect(res0.code).toBe("validation_error");

      const res13 = await getAccountStatement(
        user.user.id,
        user.checkingAccountId,
        2026,
        13,
        prisma,
      );
      expect(res13.ok).toBe(false);
      if (!res13.ok) expect(res13.code).toBe("validation_error");
    });

    it("rejects an account not owned by user", async () => {
      const peer = await seedPeerUser(prisma);
      const res = await getAccountStatement(
        user.user.id,
        peer.account.id,
        2026,
        5,
        prisma,
      );
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("not_found");
    });

    it("rejects non-existent account ID", async () => {
      const res = await getAccountStatement(
        user.user.id,
        "non_existent_id",
        2026,
        5,
        prisma,
      );
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("not_found");
    });
  });

  describe("statement calculation", () => {
    it("generates an empty statement when no transactions exist in the period", async () => {
      // Clear seeded transactions to test pure empty statement
      await prisma.transaction.deleteMany({
        where: { accountId: user.checkingAccountId },
      });

      const res = await getAccountStatement(
        user.user.id,
        user.checkingAccountId,
        2026,
        3,
        prisma,
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.transactions).toHaveLength(0);
      expect(res.data.period.year).toBe(2026);
      expect(res.data.period.month).toBe(3);
      expect(res.data.period.label).toBe("March 2026");
      expect(res.data.statementId).toContain(user.checkingAccountNumber);
      expect(res.data.statementId).toContain("2026-03");
      expect(res.data.summary.totalDeposits).toBe(0);
      expect(res.data.summary.totalWithdrawals).toBe(0);
      expect(res.data.summary.totalFees).toBe(0);
      expect(res.data.summary.totalInterest).toBe(0);
      expect(res.data.summary.netChange).toBe(0);
      expect(res.data.summary.openingBalance).toBe(res.data.summary.closingBalance);
    });

    it("calculates accurate running balances, debits, credits, and closing balance", async () => {
      await prisma.transaction.deleteMany({
        where: { accountId: user.checkingAccountId },
      });

      // Set account balance to $500 (50,000 cents)
      await prisma.account.update({
        where: { id: user.checkingAccountId },
        data: { balanceCents: 50000 },
      });

      // Transactions inside June 2026:
      // Starting balance before June: $500 - (net change in June + after)
      // We will place:
      // June 5: Deposit +$200
      // June 10: Withdrawal -$50
      // June 15: Fee -$5
      // June 20: Interest +$10
      // Net change in June = 200 - 50 - 5 + 10 = +$155
      // Ending balance in June = Opening + 155
      // So opening must equal current ($500) - 155 = $345!

      const d1 = new Date(Date.UTC(2026, 5, 5, 12, 0, 0)); // June 5, 2026
      const d2 = new Date(Date.UTC(2026, 5, 10, 14, 0, 0)); // June 10, 2026
      const d3 = new Date(Date.UTC(2026, 5, 15, 9, 0, 0)); // June 15, 2026
      const d4 = new Date(Date.UTC(2026, 5, 20, 18, 0, 0)); // June 20, 2026

      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 20000,
          type: "deposit",
          category: "income",
          description: "Payroll",
          createdAt: d1,
          notes: "Monthly salary",
        },
      });

      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 5000,
          type: "withdrawal",
          category: "food",
          description: "Groceries",
          createdAt: d2,
        },
      });

      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 500,
          type: "fee",
          category: "other",
          description: "ATM Fee",
          createdAt: d3,
        },
      });

      await prisma.transaction.create({
        data: {
          accountId: user.checkingAccountId,
          userId: user.user.id,
          amountCents: 1000,
          type: "interest",
          category: "income",
          description: "Monthly Interest",
          createdAt: d4,
        },
      });

      const res = await getAccountStatement(
        user.user.id,
        user.checkingAccountId,
        2026,
        6,
        prisma,
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.summary.openingBalance).toBe(345);
      expect(res.data.summary.totalDeposits).toBe(200);
      expect(res.data.summary.totalWithdrawals).toBe(50);
      expect(res.data.summary.totalFees).toBe(5);
      expect(res.data.summary.totalInterest).toBe(10);
      expect(res.data.summary.netChange).toBe(155);
      expect(res.data.summary.closingBalance).toBe(500);

      expect(res.data.transactions).toHaveLength(4);

      // Verify running balances on items
      expect(res.data.transactions[0]?.isCredit).toBe(true);
      expect(res.data.transactions[0]?.balanceAfter).toBe(545); // 345 + 200
      expect(res.data.transactions[0]?.notes).toBe("Monthly salary");

      expect(res.data.transactions[1]?.isCredit).toBe(false);
      expect(res.data.transactions[1]?.balanceAfter).toBe(495); // 545 - 50

      expect(res.data.transactions[2]?.isCredit).toBe(false);
      expect(res.data.transactions[2]?.balanceAfter).toBe(490); // 495 - 5

      expect(res.data.transactions[3]?.isCredit).toBe(true);
      expect(res.data.transactions[3]?.balanceAfter).toBe(500); // 490 + 10
    });

    it("counts each transfer once and keeps the fee on the sender", async () => {
      await prisma.transaction.deleteMany({ where: { userId: user.user.id } });
      const checkingBefore = await prisma.account.findUniqueOrThrow({
        where: { id: user.checkingAccountId },
      });
      const savingsBefore = await prisma.account.findUniqueOrThrow({
        where: { id: user.savingsAccountId },
      });

      const moved = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: 25_000,
          description: "Move to savings",
        },
        prisma,
      );
      expect(moved.ok).toBe(true);

      const posted = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.checkingAccountId, type: "transfer_out" },
      });
      const { year, month } = periodOf(posted.createdAt);

      const source = await getAccountStatement(
        user.user.id,
        user.checkingAccountId,
        year,
        month,
        prisma,
      );
      const destination = await getAccountStatement(
        user.user.id,
        user.savingsAccountId,
        year,
        month,
        prisma,
      );
      expect(source.ok).toBe(true);
      expect(destination.ok).toBe(true);
      if (!source.ok || !destination.ok) return;

      const checkingNow = await prisma.account.findUniqueOrThrow({
        where: { id: user.checkingAccountId },
      });
      const savingsNow = await prisma.account.findUniqueOrThrow({
        where: { id: user.savingsAccountId },
      });

      expect(source.data.transactions.map((line) => line.type)).toEqual(["transfer_out"]);
      expect(source.data.transactions[0]?.isCredit).toBe(false);
      expect(source.data.transactions[0]?.amountCents).toBe(posted.amountCents);
      expect(source.data.summary.openingBalanceCents).toBe(checkingBefore.balanceCents);
      expect(source.data.summary.closingBalanceCents).toBe(checkingNow.balanceCents);
      expect(openingPlusLines(source.data)).toBe(checkingNow.balanceCents);

      const incoming = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.savingsAccountId, type: "transfer_in" },
      });
      expect(destination.data.transactions.map((line) => line.type)).toEqual([
        "transfer_in",
      ]);
      expect(destination.data.transactions[0]?.isCredit).toBe(true);
      expect(destination.data.transactions[0]?.amountCents).toBe(incoming.amountCents);
      expect(destination.data.transactions.some((line) => line.type === "fee")).toBe(
        false,
      );
      expect(destination.data.summary.openingBalanceCents).toBe(
        savingsBefore.balanceCents,
      );
      expect(destination.data.summary.closingBalanceCents).toBe(savingsNow.balanceCents);
      expect(openingPlusLines(destination.data)).toBe(savingsNow.balanceCents);

      const peer = await seedPeerUser(prisma);
      const previousFee = process.env.EXTERNAL_TRANSFER_FEE_CENTS;
      process.env.EXTERNAL_TRANSFER_FEE_CENTS = "100";
      try {
        const sent = await transferExternal(
          user.user.id,
          {
            fromAccountId: user.checkingAccountId,
            targetAccountNumber: peer.account.number,
            amountCents: 4_000,
            description: "Rent",
          },
          prisma,
        );
        expect(sent.ok).toBe(true);
        if (!sent.ok) return;
        expect(sent.data.feeCents).toBeGreaterThan(0);

        const sender = await getAccountStatement(
          user.user.id,
          user.checkingAccountId,
          year,
          month,
          prisma,
        );
        const recipient = await getAccountStatement(
          peer.user.id,
          peer.account.id,
          year,
          month,
          prisma,
        );
        expect(sender.ok).toBe(true);
        expect(recipient.ok).toBe(true);
        if (!sender.ok || !recipient.ok) return;

        const senderNow = await prisma.account.findUniqueOrThrow({
          where: { id: user.checkingAccountId },
        });
        const recipientNow = await prisma.account.findUniqueOrThrow({
          where: { id: peer.account.id },
        });

        const senderFees = sender.data.transactions.filter((line) => line.type === "fee");
        expect(senderFees).toHaveLength(1);
        expect(senderFees[0]?.isCredit).toBe(false);
        expect(senderFees[0]?.amountCents).toBe(sent.data.feeCents);
        expect(
          sender.data.transactions.filter((line) => line.type === "transfer_out"),
        ).toHaveLength(2);
        expect(sender.data.summary.closingBalanceCents).toBe(senderNow.balanceCents);
        expect(openingPlusLines(sender.data)).toBe(senderNow.balanceCents);

        expect(recipient.data.transactions.map((line) => line.type)).toEqual([
          "transfer_in",
        ]);
        expect(recipient.data.transactions[0]?.isCredit).toBe(true);
        expect(recipient.data.transactions.some((line) => line.type === "fee")).toBe(
          false,
        );
        expect(recipient.data.summary.closingBalanceCents).toBe(
          recipientNow.balanceCents,
        );
        expect(openingPlusLines(recipient.data)).toBe(recipientNow.balanceCents);
      } finally {
        if (previousFee === undefined) delete process.env.EXTERNAL_TRANSFER_FEE_CENTS;
        else process.env.EXTERNAL_TRANSFER_FEE_CENTS = previousFee;
      }
    });

    it("shows credit-card interest as a debit, not a deposit", async () => {
      await prisma.transaction.deleteMany({ where: { userId: user.user.id } });
      await prisma.account.update({
        where: { id: user.savingsAccountId },
        data: { interestRate: null },
      });

      const credit = await prisma.account.create({
        data: {
          userId: user.user.id,
          type: "credit",
          number: "CRD-STMT-01",
          balanceCents: -100_000,
          creditLimitCents: 500_000,
          interestRate: 20,
          lastInterestAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      });

      const posted = await runDueJobs({ userId: user.user.id }, prisma);
      expect(posted.interestAccounts).toBe(1);

      const row = await prisma.transaction.findFirstOrThrow({
        where: { accountId: credit.id, type: "interest" },
      });
      const account = await prisma.account.findUniqueOrThrow({
        where: { id: credit.id },
      });
      const { year, month } = periodOf(row.createdAt);

      const res = await getAccountStatement(user.user.id, credit.id, year, month, prisma);
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.transactions).toHaveLength(1);
      expect(res.data.transactions[0]?.type).toBe("interest");
      expect(res.data.transactions[0]?.isCredit).toBe(false);
      expect(res.data.transactions[0]?.amountCents).toBe(row.amountCents);
      expect(res.data.summary.totalDepositsCents).toBe(0);
      expect(res.data.summary.totalInterestCents).toBe(-row.amountCents);
      expect(res.data.summary.openingBalanceCents).toBe(
        account.balanceCents + row.amountCents,
      );
      expect(res.data.summary.closingBalanceCents).toBe(account.balanceCents);
      expect(openingPlusLines(res.data)).toBe(account.balanceCents);
    });
  });
});
