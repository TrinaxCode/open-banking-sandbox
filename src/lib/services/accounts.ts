import { randomBytes } from "crypto";
import type { Account, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_PREFIXES,
  DEFAULT_CREDIT_LIMIT_CENTS,
  DEFAULT_DUE_DATE,
  DEFAULT_INTEREST_RATES,
  type AccountType,
} from "@/lib/domain";
import {
  ServiceException,
  fail,
  logUnexpected,
  ok,
  toFailure,
  type Result,
} from "@/lib/services/result";

type Client = PrismaClient | Prisma.TransactionClient;

export function generateAccountNumber(type: AccountType): string {
  const prefix = ACCOUNT_PREFIXES[type] ?? "ACC";
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function generateUniqueAccountNumber(
  type: AccountType,
  client: Client = prisma,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = generateAccountNumber(type);
    const exists = await client.account.findUnique({
      where: { number },
      select: { id: true },
    });
    if (!exists) return number;
  }
  throw new ServiceException(
    "internal_error",
    "Failed to generate a unique account number. Please try again.",
  );
}

export async function listAccounts(
  userId: string,
  client: Client = prisma,
): Promise<Account[]> {
  return client.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAccountForUser(
  userId: string,
  accountId: string,
  client: Client = prisma,
): Promise<Account | null> {
  return client.account.findFirst({ where: { id: accountId, userId } });
}

/** Open a new account, with the per-type defaults (rate, credit line, due date). */
export async function createAccountForUser(
  userId: string,
  type: AccountType,
  client: PrismaClient = prisma,
): Promise<Result<Account>> {
  try {
    const account = await client.account.create({
      data: {
        userId,
        type,
        number: await generateUniqueAccountNumber(type, client),
        balanceCents: 0,
        interestRate: DEFAULT_INTEREST_RATES[type],
        creditLimitCents: type === "credit" ? DEFAULT_CREDIT_LIMIT_CENTS : null,
        dueDate: type === "credit" ? DEFAULT_DUE_DATE : null,
      },
    });
    return ok(account);
  } catch (err) {
    logUnexpected("createAccountForUser", err);
    return toFailure(err);
  }
}

export async function updateAccountNickname(
  userId: string,
  accountId: string,
  nickname: string,
  client: PrismaClient = prisma,
): Promise<Result<null>> {
  try {
    const result = await client.account.updateMany({
      where: { id: accountId, userId },
      data: { nickname: nickname.trim() || null },
    });
    if (result.count === 0) return fail("not_found", "Account not found");
    return ok(null);
  } catch (err) {
    logUnexpected("updateAccountNickname", err);
    return toFailure(err);
  }
}

export async function deleteAccountForUser(
  userId: string,
  accountId: string,
  client: PrismaClient = prisma,
): Promise<Result<null>> {
  try {
    await client.$transaction(async (tx) => {
      // The balance predicate is a write, so a contribution cannot move the
      // funds into a goal between this check and the delete.
      const locked = await tx.account.updateMany({
        where: { id: accountId, userId, balanceCents: 0 },
        data: { updatedAt: new Date() },
      });
      if (locked.count === 0) {
        const account = await tx.account.findFirst({
          where: { id: accountId, userId },
          select: { id: true },
        });
        if (!account) throw new ServiceException("not_found", "Account not found");
        throw new ServiceException(
          "conflict",
          "Cannot delete an account with a non-zero balance. Settle all funds first.",
        );
      }

      const held = await tx.savingsGoal.aggregate({
        where: { accountId, userId },
        _sum: { currentAmountCents: true },
      });
      if ((held._sum.currentAmountCents ?? 0) !== 0) {
        throw new ServiceException(
          "conflict",
          "Cannot delete an account while a savings goal still holds funds. Delete the goal first.",
        );
      }

      await tx.account.delete({ where: { id: accountId } });
    });
    return ok(null);
  } catch (err) {
    logUnexpected("deleteAccountForUser", err);
    return toFailure(err, "Unexpected error");
  }
}
