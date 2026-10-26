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
import { contributeToGoal, createGoal, deleteGoal } from "@/lib/services/goals";

describe("goals service", () => {
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

  async function balanceOf(accountId: string): Promise<number> {
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: accountId },
    });
    return account.balanceCents;
  }

  async function newGoal(targetAmountCents = 1_000_00) {
    const result = await createGoal(
      user.user.id,
      {
        name: "Emergency fund",
        targetAmountCents,
        accountId: user.savingsAccountId,
        deadline: null,
        color: "emerald",
      },
      prisma,
    );
    if (!result.ok) throw new Error("goal not created");
    return result.data;
  }

  it("rejects a goal linked to an account the user does not own", async () => {
    const peer = await seedPeerUser(prisma);
    const result = await createGoal(
      user.user.id,
      {
        name: "Nope",
        targetAmountCents: 10_000,
        accountId: peer.account.id,
        deadline: null,
        color: "emerald",
      },
      prisma,
    );

    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });

  it("moves money out of the linked account on contribution", async () => {
    const goal = await newGoal();
    const result = await contributeToGoal(user.user.id, goal.id, 25_000, prisma);

    expect(result.ok).toBe(true);
    expect(await balanceOf(user.savingsAccountId)).toBe(1_000_000 - 25_000);

    const updated = await prisma.savingsGoal.findUniqueOrThrow({
      where: { id: goal.id },
    });
    expect(updated.currentAmountCents).toBe(25_000);
    expect(updated.achievedAt).toBeNull();

    const tx = await prisma.transaction.findFirstOrThrow({
      where: { accountId: user.savingsAccountId, type: "withdrawal" },
    });
    expect(tx.amountCents).toBe(25_000);
    expect(tx.category).toBe("transfer");
  });

  it("rejects a negative contribution before it can mint a balance", async () => {
    const goal = await newGoal();
    const before = await balanceOf(user.savingsAccountId);

    const result = await contributeToGoal(user.user.id, goal.id, -25_000, prisma);

    expect(result).toMatchObject({ ok: false, code: "validation_error" });
    expect(await balanceOf(user.savingsAccountId)).toBe(before);
    const stored = await prisma.savingsGoal.findUniqueOrThrow({ where: { id: goal.id } });
    expect(stored.currentAmountCents).toBe(0);
    expect(
      await prisma.transaction.count({
        where: { accountId: user.savingsAccountId, description: { contains: goal.name } },
      }),
    ).toBe(0);
  });

  it("rejects a contribution larger than the balance", async () => {
    const goal = await newGoal();
    const result = await contributeToGoal(user.user.id, goal.id, 1_000_001, prisma);

    expect(result).toMatchObject({ ok: false, code: "insufficient_funds" });
    expect(await balanceOf(user.savingsAccountId)).toBe(1_000_000);
  });

  it("marks the goal as achieved and notifies once the target is reached", async () => {
    const goal = await newGoal(50_000);
    const result = await contributeToGoal(user.user.id, goal.id, 50_000, prisma);

    expect(result.ok && result.data.achieved).toBe(true);
    const updated = await prisma.savingsGoal.findUniqueOrThrow({
      where: { id: goal.id },
    });
    expect(updated.achievedAt).not.toBeNull();

    const notification = await prisma.notification.findFirstOrThrow({
      where: { userId: user.user.id, type: "goal" },
    });
    expect(notification.title).toContain("Goal reached");
  });

  it("refunds the saved amount when the goal is deleted", async () => {
    const goal = await newGoal();
    await contributeToGoal(user.user.id, goal.id, 75_000, prisma);
    const balanceAfterContribution = await balanceOf(user.savingsAccountId);

    const result = await deleteGoal(user.user.id, goal.id, prisma);

    expect(result.ok && result.data.refundedCents).toBe(75_000);
    expect(await balanceOf(user.savingsAccountId)).toBe(
      balanceAfterContribution + 75_000,
    );
    expect(await prisma.savingsGoal.findUnique({ where: { id: goal.id } })).toBeNull();

    const refund = await prisma.transaction.findFirstOrThrow({
      where: {
        accountId: user.savingsAccountId,
        type: "deposit",
        description: { startsWith: "Refund from goal" },
      },
    });
    expect(refund.amountCents).toBe(75_000);
  });

  it("refuses to touch a goal owned by another user", async () => {
    const peer = await seedPeerUser(prisma);
    const peerAccount = peer.account.id;
    const peerGoal = await prisma.savingsGoal.create({
      data: {
        userId: peer.user.id,
        accountId: peerAccount,
        name: "Peer goal",
        targetAmountCents: 10_000,
        currentAmountCents: 5_000,
      },
    });

    const result = await contributeToGoal(user.user.id, peerGoal.id, 1_000, prisma);
    expect(result).toMatchObject({ ok: false, code: "not_found" });
  });
});
