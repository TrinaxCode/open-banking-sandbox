import type { PrismaClient, RecurringTransfer } from "@prisma/client";
import type { RecurringFrequency } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { logUnexpected, fail, ok, toFailure, type Result } from "@/lib/services/result";
import { bookableCentsError } from "@/lib/validations";

export interface CreateRecurringInput {
  fromAccountId: string;
  targetAccountNumber: string;
  amountCents: number;
  frequency: RecurringFrequency;
  description: string;
  startDate: Date | null;
}

/** Advance a schedule one period from `from`. */
export function computeNextRun(from: Date, frequency: string): Date {
  const next = new Date(from.getTime());
  if (frequency === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === "weekly") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  // `setMonth` overflows Jan 31 into March. Clamp to the last day of the
  // target month so a month-end rule still runs in February.
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, lastDay));
  return next;
}

export async function listRecurringTransfers(
  userId: string,
  client: PrismaClient = prisma,
): Promise<RecurringTransfer[]> {
  return client.recurringTransfer.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRecurringTransfer(
  userId: string,
  input: CreateRecurringInput,
  client: PrismaClient = prisma,
): Promise<Result<RecurringTransfer>> {
  const invalid = bookableCentsError(input.amountCents);
  if (invalid) return fail("validation_error", invalid);

  try {
    const from = await client.account.findFirst({
      where: { id: input.fromAccountId, userId },
      select: { id: true },
    });
    if (!from) return fail("not_found", "Source account not found");

    const target = await client.account.findUnique({
      where: { number: input.targetAccountNumber },
      select: { id: true },
    });
    if (!target) return fail("invalid_destination", "Invalid destination account");

    const schedule = await client.recurringTransfer.create({
      data: {
        userId,
        fromAccountId: input.fromAccountId,
        targetAccountNumber: input.targetAccountNumber,
        amountCents: input.amountCents,
        frequency: input.frequency,
        description: input.description || null,
        nextRunAt: input.startDate ?? new Date(),
      },
    });

    return ok(schedule);
  } catch (err) {
    logUnexpected("createRecurringTransfer", err);
    return toFailure(err);
  }
}

export async function toggleRecurringTransfer(
  userId: string,
  id: string,
  client: PrismaClient = prisma,
): Promise<Result<RecurringTransfer>> {
  try {
    const current = await client.recurringTransfer.findFirst({
      where: { id, userId },
    });
    if (!current) return fail("not_found", "Scheduled transfer not found");

    const updated = await client.recurringTransfer.update({
      where: { id },
      data: { active: !current.active },
    });
    return ok(updated);
  } catch (err) {
    logUnexpected("toggleRecurringTransfer", err);
    return toFailure(err);
  }
}

export async function deleteRecurringTransfer(
  userId: string,
  id: string,
  client: PrismaClient = prisma,
): Promise<Result<null>> {
  try {
    const result = await client.recurringTransfer.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) return fail("not_found", "Scheduled transfer not found");
    return ok(null);
  } catch (err) {
    logUnexpected("deleteRecurringTransfer", err);
    return toFailure(err);
  }
}
