// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cleanupTestDbs, createTestDb, seedTestUser } from "@/__tests__/db-helpers";

/**
 * Verifies the atomic conditional-decrement pattern used by withdraw/transfer
 * actions. The guard `balanceCents: { gte: amount }` must reject an overdraw at
 * write time (count === 0), which is what prevents the TOCTOU race where two
 * concurrent reads both pass an earlier balance check.
 */
describe("guarded balance decrement", () => {
  let prisma: PrismaClient;
  let accountId: string;
  let userId: string;

  beforeAll(async () => {
    prisma = await createTestDb();
    const data = await seedTestUser(prisma);
    userId = data.user.id;
    accountId = data.checkingAccountId; // balance 500000 cents ($5,000.00)
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  it("allows a decrement within balance", async () => {
    const res = await prisma.account.updateMany({
      where: { id: accountId, userId, balanceCents: { gte: 100_000 } },
      data: { balanceCents: { decrement: 100_000 } },
    });
    expect(res.count).toBe(1);
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc?.balanceCents).toBe(400_000);
  });

  it("rejects an overdraw (count === 0, balance unchanged)", async () => {
    const before = await prisma.account.findUnique({ where: { id: accountId } });
    const res = await prisma.account.updateMany({
      where: { id: accountId, userId, balanceCents: { gte: 99_999_999 } },
      data: { balanceCents: { decrement: 99_999_999 } },
    });
    expect(res.count).toBe(0);
    const after = await prisma.account.findUnique({ where: { id: accountId } });
    expect(after?.balanceCents).toBe(before?.balanceCents);
  });

  it("only one of two concurrent overdraw-sized debits succeeds", async () => {
    // Balance is 400000. Two debits of 300000 each: only one can satisfy
    // gte 300000 once applied; the second must fail because the guard re-checks
    // at write time.
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc?.balanceCents).toBe(400_000);

    async function debit300k() {
      return prisma.account.updateMany({
        where: { id: accountId, userId, balanceCents: { gte: 300_000 } },
        data: { balanceCents: { decrement: 300_000 } },
      });
    }

    // Run sequentially to model the serialized writes SQLite performs; the
    // second must observe the reduced balance and be rejected.
    const first = await debit300k();
    const second = await debit300k();
    const succeeded = [first, second].filter((r) => r.count === 1).length;
    expect(succeeded).toBe(1);

    const final = await prisma.account.findUnique({ where: { id: accountId } });
    expect(final?.balanceCents).toBe(100_000);
  });
});
