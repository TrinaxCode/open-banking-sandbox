/**
 * Background jobs.
 *
 * Two kinds of work run here:
 *   1. Due scheduled transfers — every rule that is past its `nextRunAt`.
 *   2. Interest accrual — savings earn, credit debt charges.
 *
 * Both are written to be safe to call from any trigger:
 *   - `POST /api/jobs/run` (cron / worker) runs everything, unscoped.
 *   - The dashboard layout calls `maybeRunDueJobs`, which is throttled by an
 *     atomic lock row so a page render cannot stampede the work.
 *
 * The recurring batch is deliberately different from a naive loop: the due
 * rules and every account they touch are read up front, and the whole batch
 * commits in a single transaction. Each debit still uses a conditional
 * `updateMany` guard, so per-rule atomicity is unchanged while the query count
 * drops from O(rules) transactions to one.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { categorize } from "@/lib/categorize";
import { computeTransferFeeCents } from "@/lib/fees";
import {
  accrualCents,
  accrualWindowDays,
  INTEREST_CHARGE_CATEGORY,
  MIN_ACCRUAL_CENTS,
} from "@/lib/interest";
import { formatCents } from "@/lib/money";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { computeNextRun } from "@/lib/services/recurring";
import { bookableCentsError } from "@/lib/validations";

/** Prefix for per-user dashboard throttle keys. */
export const DASHBOARD_LOCK_KEY = "dashboard-jobs";

/** Minimum time between two dashboard-triggered runs. */
export const DASHBOARD_JOB_INTERVAL_MS = 60_000;

export interface JobRunSummary {
  recurringExecuted: number;
  recurringSkipped: number;
  interestAccounts: number;
  interestCents: number;
  /** True when the throttle skipped this attempt because it ran too recently. */
  skippedByLock: boolean;
  ranAt: string;
}

function emptySummary(ranAt: Date, skippedByLock = false): JobRunSummary {
  return {
    recurringExecuted: 0,
    recurringSkipped: 0,
    interestAccounts: 0,
    interestCents: 0,
    skippedByLock,
    ranAt: ranAt.toISOString(),
  };
}

/**
 * Claim the throttle lock. Atomic: `updateMany` only matches when the previous
 * run is old enough, and the insert only succeeds for the first caller, so
 * concurrent renders cannot both win.
 */
async function claimLock(
  key: string,
  minIntervalMs: number,
  now: Date,
  client: PrismaClient,
): Promise<boolean> {
  const threshold = new Date(now.getTime() - minIntervalMs);
  const claimed = await client.jobLock.updateMany({
    where: { key, lastRunAt: { lte: threshold } },
    data: { lastRunAt: now },
  });
  if (claimed.count > 0) return true;

  try {
    await client.jobLock.create({ data: { key, lastRunAt: now } });
    return true;
  } catch {
    return false; // another run holds the lock
  }
}

async function writeSummary(
  key: string,
  summary: JobRunSummary,
  client: PrismaClient,
): Promise<void> {
  await client.jobLock
    .update({
      where: { key },
      data: { lastRunSummary: JSON.stringify(summary) },
    })
    .catch(() => {});
}

/** Run every due scheduled transfer in a single transaction. */
async function runDueRecurringTransfers(
  userId: string | undefined,
  now: Date,
  client: PrismaClient,
): Promise<{ executed: number; skipped: number }> {
  const due = await client.recurringTransfer.findMany({
    where: {
      ...(userId ? { userId } : {}),
      active: true,
      nextRunAt: { lte: now },
    },
    orderBy: { nextRunAt: "asc" },
    take: 500,
  });
  if (due.length === 0) return { executed: 0, skipped: 0 };

  // Preload every account the batch touches: sources by id, destinations by
  // account number. This replaces two lookups per rule.
  const sourceIds = Array.from(new Set(due.map((rule) => rule.fromAccountId)));
  const targetNumbers = Array.from(new Set(due.map((rule) => rule.targetAccountNumber)));
  const [sources, targets] = await Promise.all([
    client.account.findMany({ where: { id: { in: sourceIds } } }),
    client.account.findMany({ where: { number: { in: targetNumbers } } }),
  ]);
  const sourceById = new Map(sources.map((account) => [account.id, account]));
  const targetByNumber = new Map(targets.map((account) => [account.number, account]));

  return client.$transaction(async (tx) => {
    let executed = 0;
    let skipped = 0;
    const transactionRows: Prisma.TransactionCreateManyInput[] = [];
    const notificationRows: Prisma.NotificationCreateManyInput[] = [];

    for (const rule of due) {
      const fromAccount = sourceById.get(rule.fromAccountId);
      const toAccount = targetByNumber.get(rule.targetAccountNumber);
      const nextRunAt = computeNextRun(rule.nextRunAt, rule.frequency);

      // Claim this occurrence before moving money. A second runner that already
      // loaded the same due row cannot match `nextRunAt` after this write.
      const claimed = await tx.recurringTransfer.updateMany({
        where: { id: rule.id, active: true, nextRunAt: rule.nextRunAt },
        data: { nextRunAt },
      });
      if (claimed.count === 0) continue;

      const amountError = bookableCentsError(rule.amountCents);
      if (amountError || !fromAccount || !toAccount || toAccount.id === fromAccount.id) {
        skipped++;
        notificationRows.push({
          userId: rule.userId,
          type: "scheduled",
          title: "Scheduled transfer skipped",
          body: amountError
            ? `A scheduled transfer could not be completed (${amountError}).`
            : `A scheduled transfer of ${formatCents(rule.amountCents)} could not be completed (invalid destination).`,
        });
        continue;
      }

      const feeCents = computeTransferFeeCents({
        sameUser: toAccount.userId === rule.userId,
      });
      const totalDebitedCents = rule.amountCents + feeCents;
      const debit = await tx.account.updateMany({
        where: {
          id: rule.fromAccountId,
          userId: rule.userId,
          balanceCents: { gte: totalDebitedCents },
        },
        data: { balanceCents: { decrement: totalDebitedCents } },
      });

      if (debit.count === 0) {
        skipped++;
        // The schedule was already advanced so a failing rule does not retry-spam.
        notificationRows.push({
          userId: rule.userId,
          type: "scheduled",
          title: "Scheduled transfer skipped",
          body: `A scheduled transfer of ${formatCents(rule.amountCents)} could not be completed (Insufficient funds).`,
        });
        continue;
      }

      await tx.account.update({
        where: { id: toAccount.id },
        data: { balanceCents: { increment: rule.amountCents } },
      });

      const label = rule.description || "Scheduled transfer";
      transactionRows.push({
        userId: rule.userId,
        accountId: rule.fromAccountId,
        targetAccountId: toAccount.id,
        type: "transfer_out",
        amountCents: rule.amountCents,
        description: `${label} → ${toAccount.number}`,
        category: "transfer",
        status: "completed",
      });
      transactionRows.push({
        userId: toAccount.userId,
        accountId: toAccount.id,
        targetAccountId: rule.fromAccountId,
        type: "transfer_in",
        amountCents: rule.amountCents,
        description: `Scheduled transfer from ${fromAccount.number}`,
        category: "income",
        status: "completed",
      });
      if (feeCents > 0) {
        transactionRows.push({
          userId: rule.userId,
          accountId: rule.fromAccountId,
          targetAccountId: toAccount.id,
          type: "fee",
          amountCents: feeCents,
          description: `External transfer fee (${toAccount.number})`,
          category: categorize("fee", null),
          status: "completed",
        });
      }
      notificationRows.push({
        userId: rule.userId,
        type: "scheduled",
        title: "Scheduled transfer sent",
        body: `${formatCents(rule.amountCents)} sent to ${toAccount.number}.`,
      });

      await tx.recurringTransfer.update({
        where: { id: rule.id },
        data: { lastRunAt: now },
      });
      executed++;
    }

    if (transactionRows.length > 0) {
      await tx.transaction.createMany({ data: transactionRows });
    }
    if (notificationRows.length > 0) {
      await tx.notification.createMany({ data: notificationRows });
    }

    return { executed, skipped };
  });
}

/** Post accrued interest for savings balances and outstanding credit debt. */
async function runInterestAccrual(
  userId: string | undefined,
  now: Date,
  client: PrismaClient,
): Promise<{ accounts: number; cents: number }> {
  const accounts = await client.account.findMany({
    where: {
      ...(userId ? { userId } : {}),
      type: { in: ["savings", "credit"] },
      balanceCents: { not: 0 },
      interestRate: { gt: 0 },
    },
    take: 1000,
  });
  if (accounts.length === 0) return { accounts: 0, cents: 0 };

  const pending = accounts
    .map((account) => {
      const days = accrualWindowDays(account.lastInterestAt, now);
      const cents = accrualCents({
        type: account.type,
        balanceCents: account.balanceCents,
        annualRatePct: account.interestRate,
        days,
      });
      return { account, days, cents };
    })
    .filter((entry) => Math.abs(entry.cents) >= MIN_ACCRUAL_CENTS);

  if (pending.length === 0) return { accounts: 0, cents: 0 };

  return client.$transaction(async (tx) => {
    let posted = 0;
    let postedCents = 0;

    for (const { account, days, cents } of pending) {
      // Optimistic guard: only post if the balance has not moved since we read
      // it, so a concurrent transfer cannot make the accrual stale.
      const updated = await tx.account.updateMany({
        where: { id: account.id, balanceCents: account.balanceCents },
        data: {
          balanceCents: { increment: cents },
          lastInterestAt: now,
        },
      });
      if (updated.count === 0) continue;

      const isCredit = account.type === "credit";
      await tx.transaction.create({
        data: {
          userId: account.userId,
          accountId: account.id,
          type: "interest",
          amountCents: Math.abs(cents),
          description: isCredit
            ? `Interest charged (${days} day${days === 1 ? "" : "s"})`
            : `Interest earned (${days} day${days === 1 ? "" : "s"})`,
          // Interest earned is income; interest charged on debt is a cost.
          category: isCredit ? INTEREST_CHARGE_CATEGORY : categorize("interest", null),
          status: "completed",
        },
      });

      await notify(
        tx,
        account.userId,
        "interest",
        isCredit ? "Interest charged" : "Interest earned",
        isCredit
          ? `Interest of ${formatCents(Math.abs(cents))} was charged on your ${account.nickname || account.number} account.`
          : `Your ${account.nickname || account.number} account earned ${formatCents(Math.abs(cents))} in interest.`,
      );

      posted++;
      postedCents += cents;
    }

    return { accounts: posted, cents: postedCents };
  });
}

/**
 * Run all due work. Pass `userId` to scope it to a single user (dashboard);
 * omit it to process every user (cron worker). Rejects on failure so workers
 * can report an unsuccessful run; each completed stage remains committed.
 */
export async function runDueJobs(
  options: { userId?: string; now?: Date } = {},
  client: PrismaClient = prisma,
): Promise<JobRunSummary> {
  const now = options.now ?? new Date();
  const summary = emptySummary(now);

  const recurring = await runDueRecurringTransfers(options.userId, now, client);
  summary.recurringExecuted = recurring.executed;
  summary.recurringSkipped = recurring.skipped;

  const interest = await runInterestAccrual(options.userId, now, client);
  summary.interestAccounts = interest.accounts;
  summary.interestCents = interest.cents;

  return summary;
}

/**
 * Dashboard entry point: runs the jobs at most once per
 * `DASHBOARD_JOB_INTERVAL_MS` per user, and usually returns immediately without
 * touching the financial tables.
 */
export async function maybeRunDueJobs(
  userId: string,
  client: PrismaClient = prisma,
): Promise<JobRunSummary> {
  const now = new Date();
  const lockKey = `${DASHBOARD_LOCK_KEY}:${userId}`;
  try {
    const claimed = await claimLock(lockKey, DASHBOARD_JOB_INTERVAL_MS, now, client);
    if (!claimed) return emptySummary(now, true);

    const summary = await runDueJobs({ userId, now }, client);
    await writeSummary(lockKey, summary, client);
    return summary;
  } catch (err) {
    console.error("maybeRunDueJobs error:", err);
    return emptySummary(now, true);
  }
}
