// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type PeerUser,
  type TestUser,
} from "@/__tests__/db-helpers";
import { MAX_TRANSACTION_CENTS } from "@/lib/money";
import {
  depositFunds,
  simulateCardPurchase,
  transferExternal,
  transferInternal,
  withdrawFunds,
} from "@/lib/services/payments";

/**
 * The financial core, exercised against a real SQLite database.
 * Each test re-seeds so balances are known and tests cannot leak state.
 */
describe("payments service", () => {
  let prisma: PrismaClient;
  let user: TestUser;
  let peer: PeerUser;

  beforeAll(async () => {
    prisma = await createTestDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  beforeEach(async () => {
    user = await seedTestUser(prisma);
    peer = await seedPeerUser(prisma);
    // Deterministic fee policy ($1.00) regardless of the developer's .env.
    delete process.env.EXTERNAL_TRANSFER_FEE_CENTS;
  });

  async function balanceOf(accountId: string): Promise<number> {
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    return account.balanceCents;
  }

  describe("depositFunds", () => {
    it("adds money and writes a deposit transaction", async () => {
      const result = await depositFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: 25_000,
          description: "Paycheck",
        },
        prisma,
      );

      expect(result.ok).toBe(true);
      expect(await balanceOf(user.checkingAccountId)).toBe(525_000);

      const tx = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.checkingAccountId, type: "deposit" },
        orderBy: { createdAt: "desc" },
      });
      expect(tx.amountCents).toBe(25_000);
      expect(tx.description).toBe("Paycheck");
      expect(tx.category).toBe("income");
    });

    it("refuses an account that belongs to somebody else", async () => {
      const result = await depositFunds(
        user.user.id,
        { accountId: peer.account.id, amountCents: 25_000, description: "" },
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "not_found" });
      expect(await balanceOf(peer.account.id)).toBe(0);
    });
  });

  describe("withdrawFunds", () => {
    it("removes money within the balance", async () => {
      const result = await withdrawFunds(
        user.user.id,
        { accountId: user.checkingAccountId, amountCents: 100_000, description: "Rent" },
        prisma,
      );

      expect(result.ok).toBe(true);
      expect(await balanceOf(user.checkingAccountId)).toBe(400_000);
    });

    it("rejects an overdraw without touching the balance", async () => {
      const result = await withdrawFunds(
        user.user.id,
        { accountId: user.checkingAccountId, amountCents: 500_001, description: "" },
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "insufficient_funds" });
      expect(result.ok === false && result.message).toBe("Insufficient funds");
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
    });

    it("respects the credit limit on a credit account", async () => {
      const credit = await prisma.account.create({
        data: {
          userId: user.user.id,
          type: "credit",
          number: "CRD-TEST-001",
          balanceCents: 0,
          creditLimitCents: 50_000,
          interestRate: 19.99,
        },
      });

      const tooMuch = await withdrawFunds(
        user.user.id,
        { accountId: credit.id, amountCents: 60_000, description: "" },
        prisma,
      );
      expect(tooMuch).toMatchObject({ ok: false, code: "credit_limit_exceeded" });

      const withinLimit = await withdrawFunds(
        user.user.id,
        { accountId: credit.id, amountCents: 40_000, description: "Hotel" },
        prisma,
      );
      expect(withinLimit.ok).toBe(true);
      expect(await balanceOf(credit.id)).toBe(-40_000);
    });
  });

  describe("transferInternal", () => {
    it("moves money between two own accounts and writes both legs", async () => {
      const result = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: 150_000,
          description: "Savings",
        },
        prisma,
      );

      expect(result.ok).toBe(true);
      expect(result.ok && result.data.balanceCents).toBe(350_000);
      expect(await balanceOf(user.checkingAccountId)).toBe(350_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_150_000);

      const legs = await prisma.transaction.findMany({
        where: { type: { in: ["transfer_out", "transfer_in"] } },
      });
      expect(legs).toHaveLength(2);
      expect(legs.filter((l) => l.type === "transfer_out")[0]?.category).toBe("transfer");
      expect(legs.filter((l) => l.type === "transfer_in")[0]?.category).toBe("income");
    });

    it("rejects a target account owned by another user", async () => {
      const result = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: peer.account.id,
          amountCents: 1_000,
          description: "",
        },
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "not_found" });
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
    });

    it("rejects a transfer larger than the balance", async () => {
      const result = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: 500_001,
          description: "",
        },
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "insufficient_funds" });
    });
  });

  describe("transferExternal", () => {
    it("charges the flat fee and records it as its own ledger row", async () => {
      const result = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 20_000,
          description: "Dinner",
        },
        prisma,
      );

      expect(result.ok && result.data.feeCents).toBe(100);
      expect(result.ok && result.data.totalDebitedCents).toBe(20_100);
      expect(result.ok && result.data.balanceCents).toBe(479_900);
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000 - 20_100);
      expect(await balanceOf(peer.account.id)).toBe(20_000);

      const feeRow = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.checkingAccountId, type: "fee" },
      });
      expect(feeRow.amountCents).toBe(100);
      expect(feeRow.category).toBe("bills");
    });

    it("waives the fee when the money stays with the same user", async () => {
      const result = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber, // own savings
          amountCents: 30_000,
          description: "To savings",
        },
        prisma,
      );

      expect(result.ok && result.data.feeCents).toBe(0);
      expect(await balanceOf(user.checkingAccountId)).toBe(470_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_030_000);
      expect(await prisma.transaction.count({ where: { type: "fee" } })).toBe(0);
    });

    it("honours a zero-fee configuration", async () => {
      process.env.EXTERNAL_TRANSFER_FEE_CENTS = "0";

      const result = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 5_000,
          description: "",
        },
        prisma,
      );

      expect(result.ok && result.data.feeCents).toBe(0);
      expect(await balanceOf(user.checkingAccountId)).toBe(495_000);
      delete process.env.EXTERNAL_TRANSFER_FEE_CENTS;
    });

    it("requires the balance to cover amount plus fee", async () => {
      // Balance 500000; asking for 500000 + 100 fee must fail.
      const result = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 500_000,
          description: "",
        },
        prisma,
      );

      expect(result).toMatchObject({ ok: false, code: "insufficient_funds" });
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await balanceOf(peer.account.id)).toBe(0);
    });

    it("returns a generic error for unknown or self destinations", async () => {
      const unknown = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: "CHK-NOPE00",
          amountCents: 1_000,
          description: "",
        },
        prisma,
      );
      expect(unknown).toMatchObject({ ok: false, code: "invalid_destination" });

      const self = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.checkingAccountNumber,
          amountCents: 1_000,
          description: "",
        },
        prisma,
      );
      expect(self).toMatchObject({ ok: false, code: "invalid_destination" });
    });

    it("notifies the recipient", async () => {
      await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 10_000,
          description: "",
        },
        prisma,
      );

      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: peer.user.id },
      });
      expect(notification.title).toBe("Money received");
      expect(notification.body).toContain("$100.00");
    });
  });

  describe("amount bounds", () => {
    const illegal = [0, -1, -25_000, 0.5, 1.5, MAX_TRANSACTION_CENTS + 1, Number.NaN];

    it("rejects a deposit outside one cent through the cap before writing", async () => {
      const before = await prisma.transaction.count();

      for (const amountCents of illegal) {
        const result = await depositFunds(
          user.user.id,
          { accountId: user.checkingAccountId, amountCents, description: "bad" },
          prisma,
        );
        expect(result).toMatchObject({ ok: false, code: "validation_error" });
      }

      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await prisma.transaction.count()).toBe(before);
    });

    it("rejects a withdrawal outside one cent through the cap before writing", async () => {
      const before = await prisma.transaction.count();

      for (const amountCents of illegal) {
        const result = await withdrawFunds(
          user.user.id,
          { accountId: user.checkingAccountId, amountCents, description: "bad" },
          prisma,
        );
        expect(result).toMatchObject({ ok: false, code: "validation_error" });
      }

      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await prisma.transaction.count()).toBe(before);
    });

    it("rejects an internal or external transfer outside the cap before writing", async () => {
      const before = await prisma.transaction.count();
      const tooBig = MAX_TRANSACTION_CENTS + 1;

      const internal = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: -100,
          description: "",
        },
        prisma,
      );
      const external = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: tooBig,
          description: "",
        },
        prisma,
      );

      expect(internal).toMatchObject({ ok: false, code: "validation_error" });
      expect(external).toMatchObject({ ok: false, code: "validation_error" });
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_000_000);
      expect(await balanceOf(peer.account.id)).toBe(0);
      expect(await prisma.transaction.count()).toBe(before);
    });

    it("accepts a deposit of the maximum amount", async () => {
      const result = await depositFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: MAX_TRANSACTION_CENTS,
          description: "cap",
        },
        prisma,
      );

      expect(result.ok).toBe(true);
      expect(await balanceOf(user.checkingAccountId)).toBe(
        500_000 + MAX_TRANSACTION_CENTS,
      );
    });
  });

  describe("idempotency", () => {
    it("deduplicates repeated deposits with the same idempotencyKey", async () => {
      const first = await depositFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: 15_000,
          description: "Idempotent deposit",
          idempotencyKey: "dep-key-001",
        },
        prisma,
      );
      const second = await depositFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: 15_000,
          description: "Idempotent deposit",
          idempotencyKey: "dep-key-001",
        },
        prisma,
      );

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.data.transactionId).toBe(first.data.transactionId);
      }
      expect(await balanceOf(user.checkingAccountId)).toBe(515_000);
    });

    it("deduplicates repeated withdrawals, internal transfers, and external transfers", async () => {
      const w1 = await withdrawFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: 10_000,
          description: "ATM",
          idempotencyKey: "wd-key-001",
        },
        prisma,
      );
      const w2 = await withdrawFunds(
        user.user.id,
        {
          accountId: user.checkingAccountId,
          amountCents: 10_000,
          description: "ATM",
          idempotencyKey: "wd-key-001",
        },
        prisma,
      );
      expect(w1.ok && w2.ok && w1.data.transactionId === w2.data.transactionId).toBe(
        true,
      );
      expect(await balanceOf(user.checkingAccountId)).toBe(490_000);

      const i1 = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: 20_000,
          description: "Save",
          idempotencyKey: "int-key-001",
        },
        prisma,
      );
      const i2 = await transferInternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          toAccountId: user.savingsAccountId,
          amountCents: 20_000,
          description: "Save",
          idempotencyKey: "int-key-001",
        },
        prisma,
      );
      expect(i1.ok && i2.ok && i1.data.transactionId === i2.data.transactionId).toBe(
        true,
      );
      expect(await balanceOf(user.checkingAccountId)).toBe(470_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_020_000);

      const e1 = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 10_000,
          description: "Peer",
          idempotencyKey: "ext-key-001",
        },
        prisma,
      );
      const e2 = await transferExternal(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: peer.account.number,
          amountCents: 10_000,
          description: "Peer",
          idempotencyKey: "ext-key-001",
        },
        prisma,
      );
      expect(e1.ok && e2.ok && e1.data.transactionId === e2.data.transactionId).toBe(
        true,
      );
      expect(await balanceOf(user.checkingAccountId)).toBe(459_900);
      expect(await balanceOf(peer.account.id)).toBe(10_000);
    });
  });

  describe("simulateCardPurchase", () => {
    it("debits the selected account, increments usageCount, and auto-categorizes the merchant", async () => {
      const card = await prisma.virtualCard.create({
        data: {
          userId: user.user.id,
          cardNumber: "4532 8821 1044 7391",
          cardHolder: "TEST USER",
          expiryDate: "12/28",
          cvv: "418",
          isFrozen: false,
          isTemporary: true,
          expiresAt: new Date(Date.now() + 86_400_000),
          maxUses: 2,
          usageCount: 0,
        },
      });

      const first = await simulateCardPurchase(
        user.user.id,
        {
          cardId: card.id,
          accountId: user.checkingAccountId,
          amountCents: 1_599,
          merchant: "Netflix Subscription",
        },
        prisma,
      );
      expect(first.ok).toBe(true);
      if (first.ok) {
        expect(first.data.usageCount).toBe(1);
        expect(first.data.last4).toBe("7391");
      }
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000 - 1_599);

      const tx = await prisma.transaction.findFirstOrThrow({
        where: { id: first.ok ? first.data.transactionId : "" },
      });
      expect(tx.description).toBe("Card •••• 7391 - Netflix Subscription");
      expect(tx.category).toBe("entertainment");

      // Second use reaches maxUses (2)
      const second = await simulateCardPurchase(
        user.user.id,
        {
          cardId: card.id,
          accountId: user.checkingAccountId,
          amountCents: 1_000,
          merchant: "Uber Ride",
        },
        prisma,
      );
      expect(second.ok).toBe(true);

      // Third use exceeds maxUses (2) -> conflict
      const third = await simulateCardPurchase(
        user.user.id,
        {
          cardId: card.id,
          accountId: user.checkingAccountId,
          amountCents: 500,
          merchant: "Coffee",
        },
        prisma,
      );
      expect(third).toMatchObject({
        ok: false,
        code: "conflict",
        message: "Card usage limit reached",
      });
    });

    it("rejects frozen or expired cards", async () => {
      const frozenCard = await prisma.virtualCard.create({
        data: {
          userId: user.user.id,
          cardNumber: "4916 3309 5512 9042",
          cardHolder: "TEST USER",
          expiryDate: "12/28",
          cvv: "902",
          isFrozen: true,
        },
      });

      const frozenRes = await simulateCardPurchase(
        user.user.id,
        {
          cardId: frozenCard.id,
          accountId: user.checkingAccountId,
          amountCents: 2_500,
          merchant: "Bookstore",
        },
        prisma,
      );
      expect(frozenRes).toMatchObject({
        ok: false,
        code: "conflict",
        message: "Card is frozen",
      });

      const expiredCard = await prisma.virtualCard.create({
        data: {
          userId: user.user.id,
          cardNumber: "4916 3309 5512 1111",
          cardHolder: "TEST USER",
          expiryDate: "01/24",
          cvv: "111",
          isFrozen: false,
          isTemporary: true,
          expiresAt: new Date(Date.now() - 60_000),
        },
      });

      const expiredRes = await simulateCardPurchase(
        user.user.id,
        {
          cardId: expiredCard.id,
          accountId: user.checkingAccountId,
          amountCents: 2_500,
          merchant: "Bookstore",
        },
        prisma,
      );
      expect(expiredRes).toMatchObject({
        ok: false,
        code: "conflict",
        message: "Card has expired",
      });
    });
  });
});
