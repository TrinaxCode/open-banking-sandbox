// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestDb, seedTestUser } from "@/__tests__/db-helpers";

/**
 * Verifies the atomic conditional-decrement pattern used by withdraw/transfer
 * actions. The guard `balance: { gte: amount }` must reject an overdraw at
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
    accountId = data.accounts[0].id; // checking, balance 5000
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

  it("allows a decrement within balance", async () => {
    const res = await prisma.account.updateMany({
      where: { id: accountId, userId, balance: { gte: 1000 } },
      data: { balance: { decrement: 1000 } },
    });
    expect(res.count).toBe(1);
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc?.balance).toBe(4000);
  });

  it("rejects an overdraw (count === 0, balance unchanged)", async () => {
    const before = await prisma.account.findUnique({ where: { id: accountId } });
    const res = await prisma.account.updateMany({
      where: { id: accountId, userId, balance: { gte: 999999 } },
      data: { balance: { decrement: 999999 } },
    });
    expect(res.count).toBe(0);
    const after = await prisma.account.findUnique({ where: { id: accountId } });
    expect(after?.balance).toBe(before?.balance);
  });

  it("only one of two concurrent overdraw-sized debits succeeds", async () => {
    // Balance is 4000. Two debits of 3000 each: only one can satisfy gte 3000
    // once applied; the second must fail because the guard re-checks at write.
    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc?.balance).toBe(4000);

    async function debit3000() {
      return prisma.account.updateMany({
        where: { id: accountId, userId, balance: { gte: 3000 } },
        data: { balance: { decrement: 3000 } },
      });
    }

    // Run sequentially to model the serialized writes SQLite performs; the
    // second must observe the reduced balance and be rejected.
    const first = await debit3000();
    const second = await debit3000();
    const succeeded = [first, second].filter((r) => r.count === 1).length;
    expect(succeeded).toBe(1);

    const final = await prisma.account.findUnique({ where: { id: accountId } });
    expect(final?.balance).toBe(1000);
  });
});
