// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type PeerUser,
  type TestUser,
} from "@/__tests__/db-helpers";
import { DASHBOARD_LOCK_KEY, maybeRunDueJobs, runDueJobs } from "@/lib/jobs";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("job runner", () => {
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
    vi.stubEnv("EXTERNAL_TRANSFER_FEE_CENTS", "100");
    user = await seedTestUser(prisma);
    peer = await seedPeerUser(prisma);
    await prisma.jobLock.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function balanceOf(accountId: string): Promise<number> {
    const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
    return account.balanceCents;
  }

  function schedule(
    overrides: Partial<{
      amountCents: number;
      nextRunAt: Date;
      active: boolean;
      target: string;
      frequency: string;
    }> = {},
  ) {
    return prisma.recurringTransfer.create({
      data: {
        userId: user.user.id,
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: overrides.target ?? peer.account.number,
        amountCents: overrides.amountCents ?? 25_000,
        frequency: overrides.frequency ?? "monthly",
        description: "Rent",
        nextRunAt: overrides.nextRunAt ?? new Date(Date.now() - DAY_MS),
        active: overrides.active ?? true,
      },
    });
  }

  describe("scheduled transfers", () => {
    it("executes a due rule, moves the money and advances the schedule", async () => {
      const rule = await schedule();

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(1);
      expect(summary.recurringSkipped).toBe(0);
      expect(await balanceOf(user.checkingAccountId)).toBe(474_900);
      expect(await balanceOf(peer.account.id)).toBe(25_000);

      const updated = await prisma.recurringTransfer.findUniqueOrThrow({
        where: { id: rule.id },
      });
      expect(updated.lastRunAt).not.toBeNull();
      expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());

      const legs = await prisma.transaction.findMany({
        where: { type: { in: ["transfer_out", "transfer_in"] } },
      });
      expect(legs).toHaveLength(2);

      const fee = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.checkingAccountId, type: "fee" },
      });
      expect(fee.amountCents).toBe(100);
      expect(fee.category).toBe("bills");

      const notifications = await prisma.notification.findMany({
        where: { userId: user.user.id },
      });
      expect(notifications.map((n) => n.title)).toContain("Scheduled transfer sent");
    });

    it("requires funds for both the scheduled amount and its fee", async () => {
      await schedule({ amountCents: 500_000 });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(0);
      expect(summary.recurringSkipped).toBe(1);
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await balanceOf(peer.account.id)).toBe(0);
      expect(await prisma.transaction.count({ where: { type: "fee" } })).toBe(0);
      expect(await prisma.transaction.count({ where: { type: "transfer_out" } })).toBe(0);
    });

    it("keeps scheduled transfers between the user's own accounts free", async () => {
      await prisma.account.updateMany({ data: { interestRate: null } });
      await schedule({ target: user.savingsAccountNumber });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(1);
      expect(await balanceOf(user.checkingAccountId)).toBe(475_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_025_000);
      expect(await prisma.transaction.count({ where: { type: "fee" } })).toBe(0);
    });

    it.each([0, 250])("honours a configured scheduled fee of %i cents", async (fee) => {
      vi.stubEnv("EXTERNAL_TRANSFER_FEE_CENTS", String(fee));
      await schedule();

      await runDueJobs({ userId: user.user.id }, prisma);

      expect(await balanceOf(user.checkingAccountId)).toBe(475_000 - fee);
      expect(await balanceOf(peer.account.id)).toBe(25_000);
      const fees = await prisma.transaction.findMany({ where: { type: "fee" } });
      expect(fees.map((row) => row.amountCents)).toEqual(fee ? [fee] : []);
    });

    it("rolls back money and the schedule if the fee cannot be recorded", async () => {
      const rule = await schedule();
      const before = await prisma.transaction.count();
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_fee BEFORE INSERT ON "Transaction"
        WHEN NEW.type = 'fee'
        BEGIN SELECT RAISE(ABORT, 'test fee write failure'); END
      `);
      try {
        await expect(runDueJobs({ userId: user.user.id }, prisma)).rejects.toThrow();
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER "reject_fee"');
      }

      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await balanceOf(peer.account.id)).toBe(0);
      expect(await prisma.transaction.count()).toBe(before);
      expect(await prisma.notification.count()).toBe(0);
      const updated = await prisma.recurringTransfer.findUniqueOrThrow({
        where: { id: rule.id },
      });
      expect(updated.nextRunAt).toEqual(rule.nextRunAt);
      expect(updated.lastRunAt).toBeNull();

      expect((await runDueJobs({ userId: user.user.id }, prisma)).recurringExecuted).toBe(
        1,
      );
      expect(await balanceOf(user.checkingAccountId)).toBe(474_900);
    });

    it("skips a rule that cannot be funded, advances it and says so", async () => {
      const rule = await schedule({ amountCents: 900_000 });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(0);
      expect(summary.recurringSkipped).toBe(1);
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);

      const updated = await prisma.recurringTransfer.findUniqueOrThrow({
        where: { id: rule.id },
      });
      expect(updated.lastRunAt).toBeNull();
      expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());

      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: user.user.id, type: "scheduled" },
      });
      expect(notification.title).toBe("Scheduled transfer skipped");
      expect(notification.body).toContain("$9,000.00");
    });

    it("skips a rule whose destination no longer exists", async () => {
      const rule = await schedule({ target: "CHK-VOID00" });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringSkipped).toBe(1);
      const updated = await prisma.recurringTransfer.findUniqueOrThrow({
        where: { id: rule.id },
      });
      expect(updated.nextRunAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("posts a due rule only once when two runners overlap", async () => {
      await prisma.account.updateMany({ data: { interestRate: null } });
      await schedule({ amountCents: 25_000 });

      const [first, second] = await Promise.all([
        runDueJobs({ userId: user.user.id }, prisma),
        runDueJobs({ userId: user.user.id }, prisma),
      ]);

      expect(first.recurringExecuted + second.recurringExecuted).toBe(1);
      expect(await balanceOf(user.checkingAccountId)).toBe(474_900);
      expect(await balanceOf(peer.account.id)).toBe(25_000);
      expect(
        await prisma.transaction.count({
          where: { accountId: user.checkingAccountId, type: "transfer_out" },
        }),
      ).toBe(1);
    });

    it("does not post a rule whose amount is outside one cent through the cap", async () => {
      await prisma.account.updateMany({ data: { interestRate: null } });
      await schedule({ amountCents: 0 });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(0);
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
      expect(await balanceOf(peer.account.id)).toBe(0);
      expect(await prisma.transaction.count({ where: { type: "transfer_out" } })).toBe(0);
    });

    it("leaves paused and future rules alone", async () => {
      await schedule({ active: false });
      await schedule({ nextRunAt: new Date(Date.now() + 3 * DAY_MS) });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.recurringExecuted).toBe(0);
      expect(summary.recurringSkipped).toBe(0);
      expect(await balanceOf(user.checkingAccountId)).toBe(500_000);
    });

    it("processes every user when no userId is given (cron path)", async () => {
      // Interest is covered elsewhere; switch it off so this test is only about
      // the recurring batch across users.
      await prisma.account.updateMany({ data: { interestRate: null } });

      await schedule();

      // A second user with their own due rule.
      const otherAccount = await prisma.account.create({
        data: {
          userId: peer.user.id,
          type: "checking",
          number: "CHK-OTHER1",
          balanceCents: 100_000,
        },
      });
      await prisma.recurringTransfer.create({
        data: {
          userId: peer.user.id,
          fromAccountId: otherAccount.id,
          targetAccountNumber: user.savingsAccountNumber,
          amountCents: 10_000,
          frequency: "weekly",
          nextRunAt: new Date(Date.now() - DAY_MS),
        },
      });

      const summary = await runDueJobs({}, prisma);

      expect(summary.recurringExecuted).toBe(2);
      expect(await balanceOf(otherAccount.id)).toBe(89_900);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_010_000);
    });
  });

  describe("interest accrual", () => {
    it("does not repeat a completed transfer when retrying a failed interest stage", async () => {
      await schedule();
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_interest BEFORE INSERT ON "Transaction"
        WHEN NEW.type = 'interest'
        BEGIN SELECT RAISE(ABORT, 'test interest write failure'); END
      `);
      try {
        await expect(runDueJobs({ userId: user.user.id }, prisma)).rejects.toThrow();
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER "reject_interest"');
      }

      expect(await balanceOf(user.checkingAccountId)).toBe(474_900);
      expect(await balanceOf(peer.account.id)).toBe(25_000);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_000_000);

      const retry = await runDueJobs({ userId: user.user.id }, prisma);
      expect(retry.recurringExecuted).toBe(0);
      expect(retry.interestAccounts).toBe(1);
      expect(await balanceOf(user.checkingAccountId)).toBe(474_900);
      expect(await balanceOf(peer.account.id)).toBe(25_000);
      expect(await prisma.transaction.count({ where: { type: "fee" } })).toBe(1);
    });

    it("posts savings interest for the elapsed days", async () => {
      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      // $10,000.00 at 3.5% for a single day = 95 cents (rounded down).
      expect(summary.interestAccounts).toBe(1);
      expect(summary.interestCents).toBe(95);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_000_095);

      const row = await prisma.transaction.findFirstOrThrow({
        where: { accountId: user.savingsAccountId, type: "interest" },
      });
      expect(row.amountCents).toBe(95);
      expect(row.category).toBe("income");
      expect(row.description).toContain("1 day");

      const account = await prisma.account.findUniqueOrThrow({
        where: { id: user.savingsAccountId },
      });
      expect(account.lastInterestAt).not.toBeNull();

      const notification = await prisma.notification.findFirstOrThrow({
        where: { userId: user.user.id, type: "interest" },
      });
      expect(notification.body).toContain("$0.95");
    });

    it("is idempotent: a second run at the same moment posts nothing", async () => {
      const now = new Date();
      const first = await runDueJobs({ userId: user.user.id, now }, prisma);
      expect(first.interestCents).toBe(95);

      const second = await runDueJobs({ userId: user.user.id, now }, prisma);
      expect(second.interestAccounts).toBe(0);
      expect(second.interestCents).toBe(0);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_000_095);
    });

    it("accrues over the days since the last posting", async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * DAY_MS);
      await prisma.account.update({
        where: { id: user.savingsAccountId },
        data: { lastInterestAt: fiveDaysAgo },
      });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      // 5 days x 95 cents (floor of the daily accrual compounded into one post)
      expect(summary.interestCents).toBe(Math.floor((1_000_000 * 3.5 * 5) / 100 / 365));
    });

    it("charges interest on outstanding credit debt", async () => {
      // Only the credit line should accrue here.
      await prisma.account.update({
        where: { id: user.savingsAccountId },
        data: { interestRate: null },
      });

      const credit = await prisma.account.create({
        data: {
          userId: user.user.id,
          type: "credit",
          number: "CRD-TEST-002",
          balanceCents: -100_000,
          creditLimitCents: 500_000,
          interestRate: 20,
          lastInterestAt: new Date(Date.now() - 30 * DAY_MS),
        },
      });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      const expectedCharge = -Math.floor((100_000 * 20 * 30) / 100 / 365);
      const account = await prisma.account.findUniqueOrThrow({
        where: { id: credit.id },
      });
      expect(account.balanceCents).toBe(-100_000 + expectedCharge);
      expect(summary.interestCents).toBe(expectedCharge);

      const row = await prisma.transaction.findFirstOrThrow({
        where: { accountId: credit.id, type: "interest" },
      });
      expect(row.description).toContain("Interest charged");
      expect(row.category).toBe("bills");
    });

    it("does not accrue on an account without a rate", async () => {
      await prisma.account.update({
        where: { id: user.savingsAccountId },
        data: { interestRate: null },
      });

      const summary = await runDueJobs({ userId: user.user.id }, prisma);

      expect(summary.interestAccounts).toBe(0);
      expect(await balanceOf(user.savingsAccountId)).toBe(1_000_000);
    });
  });

  describe("dashboard throttle", () => {
    it("does not let one user's dashboard throttle another user's jobs", async () => {
      await maybeRunDueJobs(user.user.id, prisma);

      const secondUser = await maybeRunDueJobs(peer.user.id, prisma);

      expect(secondUser.skippedByLock).toBe(false);
      expect((await maybeRunDueJobs(user.user.id, prisma)).skippedByLock).toBe(true);
      expect((await maybeRunDueJobs(peer.user.id, prisma)).skippedByLock).toBe(true);
    });

    it("runs once, then skips until the interval has elapsed", async () => {
      await schedule();

      const first = await maybeRunDueJobs(user.user.id, prisma);
      expect(first.skippedByLock).toBe(false);
      expect(first.recurringExecuted).toBe(1);

      const second = await maybeRunDueJobs(user.user.id, prisma);
      expect(second.skippedByLock).toBe(true);
      expect(second.recurringExecuted).toBe(0);

      // Pretend the previous run was two minutes ago.
      await prisma.jobLock.update({
        where: { key: `${DASHBOARD_LOCK_KEY}:${user.user.id}` },
        data: { lastRunAt: new Date(Date.now() - 2 * 60 * 1000) },
      });

      const third = await maybeRunDueJobs(user.user.id, prisma);
      expect(third.skippedByLock).toBe(false);
    });
  });

  it("propagates job failures to the worker caller", async () => {
    const error = new Error("database unavailable");
    vi.spyOn(prisma.recurringTransfer, "findMany").mockRejectedValueOnce(error);

    await expect(runDueJobs({}, prisma)).rejects.toThrow(error);
  });

  it("keeps dashboard rendering available when a job fails", async () => {
    vi.spyOn(prisma.recurringTransfer, "findMany").mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(maybeRunDueJobs(user.user.id, prisma)).resolves.toMatchObject({
      recurringExecuted: 0,
      interestAccounts: 0,
    });
    expect(logged).toHaveBeenCalled();
  });
});
