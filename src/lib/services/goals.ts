import type { PrismaClient, SavingsGoal } from "@prisma/client";
import { categorize } from "@/lib/categorize";
import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import {
  logUnexpected,
  ServiceException,
  fail,
  ok,
  toFailure,
  type Result,
} from "@/lib/services/result";
import { bookableCentsError } from "@/lib/validations";

export interface CreateGoalInput {
  name: string;
  targetAmountCents: number;
  accountId: string;
  deadline: Date | null;
  color: string;
}

export interface ContributeGoalOutcome {
  goal: SavingsGoal;
  achieved: boolean;
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
  client: PrismaClient = prisma,
): Promise<Result<SavingsGoal>> {
  const invalidTarget = bookableCentsError(input.targetAmountCents);
  if (invalidTarget) return fail("validation_error", invalidTarget);

  try {
    const account = await client.account.findFirst({
      where: { id: input.accountId, userId },
      select: { id: true },
    });
    if (!account) return fail("not_found", "Linked account not found");

    const goal = await client.savingsGoal.create({
      data: {
        userId,
        accountId: input.accountId,
        name: input.name,
        targetAmountCents: input.targetAmountCents,
        color: input.color || "emerald",
        deadline: input.deadline,
      },
    });

    return ok(goal);
  } catch (err) {
    logUnexpected("createGoal", err);
    return toFailure(err);
  }
}

/**
 * Move money out of the linked account's spendable balance (guarded debit) and
 * track it against the goal. The goal is a saving target, not a separate
 * ledger, so the contribution shows up as a withdrawal on the account.
 */
export async function contributeToGoal(
  userId: string,
  goalId: string,
  amountCents: number,
  client: PrismaClient = prisma,
): Promise<Result<ContributeGoalOutcome>> {
  const invalid = bookableCentsError(amountCents);
  if (invalid) return fail("validation_error", invalid);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) throw new ServiceException("not_found", "Goal not found");

      const debit = await tx.account.updateMany({
        where: {
          id: goal.accountId,
          userId,
          balanceCents: { gte: amountCents },
        },
        data: { balanceCents: { decrement: amountCents } },
      });
      if (debit.count === 0) {
        throw new ServiceException("insufficient_funds", "Insufficient funds");
      }

      const newAmountCents = goal.currentAmountCents + amountCents;
      const achieved = newAmountCents >= goal.targetAmountCents;
      const updated = await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmountCents: newAmountCents,
          achievedAt: achieved && !goal.achievedAt ? new Date() : goal.achievedAt,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId: goal.accountId,
          type: "withdrawal",
          amountCents,
          description: `Savings goal: ${goal.name}`,
          category: "transfer",
          status: "completed",
        },
      });

      if (achieved && !goal.achievedAt) {
        await notify(
          tx,
          userId,
          "goal",
          "Goal reached! 🎉",
          `You reached your "${goal.name}" savings goal.`,
        );
      }

      return { goal: updated, achieved: achieved && !goal.achievedAt };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("contributeToGoal", err);
    return toFailure(err);
  }
}

export interface DeleteGoalOutcome {
  refundedCents: number;
}

/** Delete a goal, returning any saved funds to the linked account. */
export async function deleteGoal(
  userId: string,
  goalId: string,
  client: PrismaClient = prisma,
): Promise<Result<DeleteGoalOutcome>> {
  try {
    const outcome = await client.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) throw new ServiceException("not_found", "Goal not found");

      let refundedCents = 0;
      if (goal.currentAmountCents > 0) {
        refundedCents = goal.currentAmountCents;
        await tx.account.update({
          where: { id: goal.accountId },
          data: { balanceCents: { increment: refundedCents } },
        });
        await tx.transaction.create({
          data: {
            userId,
            accountId: goal.accountId,
            type: "deposit",
            amountCents: refundedCents,
            description: `Refund from goal: ${goal.name}`,
            category: categorize("deposit", null),
            status: "completed",
          },
        });
      }

      await tx.savingsGoal.delete({ where: { id: goalId } });
      return { refundedCents };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("deleteGoal", err);
    return toFailure(err);
  }
}
