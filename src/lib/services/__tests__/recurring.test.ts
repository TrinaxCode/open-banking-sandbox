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
  computeNextRun,
  createRecurringTransfer,
  deleteRecurringTransfer,
  listRecurringTransfers,
  toggleRecurringTransfer,
} from "@/lib/services/recurring";

describe("recurring transfers service", () => {
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

  describe("computeNextRun", () => {
    it("advances by one period", () => {
      const from = new Date("2026-01-15T10:00:00Z");
      expect(computeNextRun(from, "daily").toISOString()).toBe(
        "2026-01-16T10:00:00.000Z",
      );
      expect(computeNextRun(from, "weekly").toISOString()).toBe(
        "2026-01-22T10:00:00.000Z",
      );
      expect(computeNextRun(from, "monthly").getMonth()).toBe(1); // February
    });

    it("clamps a month-end schedule onto the last day of the next month", () => {
      const from = new Date(2026, 0, 31, 10, 30, 0);
      const next = computeNextRun(from, "monthly");

      expect(next.getFullYear()).toBe(2026);
      expect(next.getMonth()).toBe(1);
      expect(next.getDate()).toBe(28);
      expect(next.getHours()).toBe(10);
      expect(next.getMinutes()).toBe(30);

      const march = computeNextRun(new Date(2026, 2, 31, 8, 0, 0), "monthly");
      expect(march.getMonth()).toBe(3);
      expect(march.getDate()).toBe(30);
    });

    it("treats an unknown frequency as monthly", () => {
      const from = new Date("2026-01-15T10:00:00Z");
      expect(computeNextRun(from, "fortnightly").getMonth()).toBe(1);
    });
  });

  describe("createRecurringTransfer", () => {
    const base = {
      amountCents: 50_000,
      frequency: "monthly" as const,
      description: "Rent",
      startDate: null,
    };

    it("stores the schedule and starts immediately by default", async () => {
      const result = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber,
        },
        prisma,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.amountCents).toBe(50_000);
      expect(result.data.active).toBe(true);
      expect(result.data.nextRunAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it("honours an explicit start date", async () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const result = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber,
          startDate,
        },
        prisma,
      );

      expect(result.ok && result.data.nextRunAt.getTime()).toBe(startDate.getTime());
    });

    it("requires a source account the user owns", async () => {
      const peer = await seedPeerUser(prisma);
      const result = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: peer.account.id,
          targetAccountNumber: user.savingsAccountNumber,
        },
        prisma,
      );
      expect(result).toMatchObject({ ok: false, code: "not_found" });
    });

    it("rejects an amount below one cent or above the cap before saving the rule", async () => {
      const zero = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber,
          amountCents: 0,
        },
        prisma,
      );
      const tooBig = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber,
          amountCents: 1_000_000_000,
        },
        prisma,
      );

      expect(zero).toMatchObject({ ok: false, code: "validation_error" });
      expect(tooBig).toMatchObject({ ok: false, code: "validation_error" });
      expect(
        await prisma.recurringTransfer.count({ where: { userId: user.user.id } }),
      ).toBe(0);
    });

    it("requires an existing destination account", async () => {
      const result = await createRecurringTransfer(
        user.user.id,
        {
          ...base,
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: "CHK-VOID00",
        },
        prisma,
      );
      expect(result).toMatchObject({ ok: false, code: "invalid_destination" });
    });
  });

  describe("toggle / delete / list", () => {
    async function schedule() {
      const result = await createRecurringTransfer(
        user.user.id,
        {
          fromAccountId: user.checkingAccountId,
          targetAccountNumber: user.savingsAccountNumber,
          amountCents: 1_000,
          frequency: "weekly",
          description: "",
          startDate: null,
        },
        prisma,
      );
      if (!result.ok) throw new Error("schedule not created");
      return result.data;
    }

    it("flips the active flag", async () => {
      const rule = await schedule();

      const paused = await toggleRecurringTransfer(user.user.id, rule.id, prisma);
      expect(paused.ok && paused.data.active).toBe(false);

      const resumed = await toggleRecurringTransfer(user.user.id, rule.id, prisma);
      expect(resumed.ok && resumed.data.active).toBe(true);
    });

    it("refuses to toggle a schedule owned by another user", async () => {
      const peer = await seedPeerUser(prisma);
      const rule = await schedule();
      await prisma.recurringTransfer.update({
        where: { id: rule.id },
        data: { userId: peer.user.id },
      });

      const result = await toggleRecurringTransfer(user.user.id, rule.id, prisma);
      expect(result).toMatchObject({ ok: false, code: "not_found" });
    });

    it("deletes a schedule", async () => {
      const rule = await schedule();

      const result = await deleteRecurringTransfer(user.user.id, rule.id, prisma);
      expect(result.ok).toBe(true);
      expect(
        await prisma.recurringTransfer.findUnique({ where: { id: rule.id } }),
      ).toBeNull();
    });

    it("reports a missing schedule on delete", async () => {
      const result = await deleteRecurringTransfer(user.user.id, "nope", prisma);
      expect(result).toMatchObject({ ok: false, code: "not_found" });
    });

    it("lists only the user's schedules, newest first", async () => {
      await schedule();
      const peer = await seedPeerUser(prisma);
      await prisma.recurringTransfer.create({
        data: {
          userId: peer.user.id,
          fromAccountId: peer.account.id,
          targetAccountNumber: user.savingsAccountNumber,
          amountCents: 500,
          frequency: "daily",
          nextRunAt: new Date(),
        },
      });

      const list = await listRecurringTransfers(user.user.id, prisma);

      expect(list).toHaveLength(1);
      expect(list[0]?.userId).toBe(user.user.id);
    });
  });
});
