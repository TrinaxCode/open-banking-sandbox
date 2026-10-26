import type { Account, PrismaClient } from "@prisma/client";
import { categorize } from "@/lib/categorize";
import { DEFAULT_CREDIT_LIMIT_CENTS } from "@/lib/domain";
import { computeTransferFeeCents } from "@/lib/fees";
import { formatCents } from "@/lib/money";
import { emitBalanceAlerts, notify } from "@/lib/notifications";
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

function invalidAmount(amountCents: number): ReturnType<typeof fail> | null {
  const message = bookableCentsError(amountCents);
  return message ? fail("validation_error", message) : null;
}

function normalizeIdempotencyRef(key?: string): string | null {
  const trimmed = key?.trim();
  return trimmed ? `idem:${trimmed}` : null;
}

export interface DepositInput {
  accountId: string;
  amountCents: number;
  description: string;
  idempotencyKey?: string;
}

export interface DepositOutcome {
  account: Account;
  transactionId: string;
}

export interface WithdrawOutcome {
  account: Account;
  transactionId: string;
}

export interface InternalTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  description: string;
  idempotencyKey?: string;
}

export interface ExternalTransferInput {
  fromAccountId: string;
  targetAccountNumber: string;
  amountCents: number;
  description: string;
  idempotencyKey?: string;
}

export interface CardPurchaseInput {
  cardId: string;
  accountId: string;
  amountCents: number;
  merchant: string;
  idempotencyKey?: string;
}

export interface CardPurchaseOutcome {
  account: Account;
  transactionId: string;
  usageCount: number;
  last4: string;
}

export interface TransferOutcome {
  amountCents: number;
  feeCents: number;
  totalDebitedCents: number;
  fromAccountId: string;
  targetAccountId: string;
  targetAccountNumber: string;
  /** Balance of the source account after the transfer. */
  balanceCents: number;
  transactionId: string;
}

/** Add money to one of the user's accounts. */
export async function depositFunds(
  userId: string,
  input: DepositInput,
  client: PrismaClient = prisma,
): Promise<Result<DepositOutcome>> {
  const invalid = invalidAmount(input.amountCents);
  if (invalid) return invalid;
  const idemRef = normalizeIdempotencyRef(input.idempotencyKey);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId },
      });
      if (!account) throw new ServiceException("not_found", "Account not found");

      if (idemRef) {
        const existingTx = await tx.transaction.findFirst({
          where: {
            userId,
            accountId: input.accountId,
            type: "deposit",
            reference: idemRef,
          },
        });
        if (existingTx) {
          return { account, transactionId: existingTx.id };
        }
      }

      const updated = await tx.account.update({
        where: { id: input.accountId },
        data: { balanceCents: { increment: input.amountCents } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          type: "deposit",
          amountCents: input.amountCents,
          description: input.description || "Deposit",
          category: categorize("deposit", input.description),
          status: "completed",
          reference: idemRef,
        },
      });

      await emitBalanceAlerts(tx, {
        userId,
        amountCents: input.amountCents,
        newBalanceCents: updated.balanceCents,
        accountLabel: account.nickname || account.number,
        isDebit: false,
      });

      return { account: updated, transactionId: transaction.id };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("depositFunds", err);
    return toFailure(err);
  }
}

/**
 * Remove money from one of the user's accounts.
 *
 * The debit is a conditional `updateMany`: the WHERE clause re-checks the
 * balance at write time so two concurrent withdrawals cannot both pass an
 * earlier read (TOCTOU). `count === 0` means the guard failed.
 */
export async function withdrawFunds(
  userId: string,
  input: DepositInput,
  client: PrismaClient = prisma,
): Promise<Result<WithdrawOutcome>> {
  const invalid = invalidAmount(input.amountCents);
  if (invalid) return invalid;
  const idemRef = normalizeIdempotencyRef(input.idempotencyKey);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId },
      });
      if (!account) throw new ServiceException("not_found", "Account not found");

      if (idemRef) {
        const existingTx = await tx.transaction.findFirst({
          where: {
            userId,
            accountId: input.accountId,
            type: "withdrawal",
            reference: idemRef,
          },
        });
        if (existingTx) {
          return { account, transactionId: existingTx.id };
        }
      }

      if (account.type === "credit") {
        const limitCents = account.creditLimitCents ?? DEFAULT_CREDIT_LIMIT_CENTS;
        // balance - amount >= -limit  ⇔  balance >= amount - limit
        const guard = await tx.account.updateMany({
          where: {
            id: input.accountId,
            userId,
            balanceCents: { gte: input.amountCents - limitCents },
          },
          data: { balanceCents: { decrement: input.amountCents } },
        });
        if (guard.count === 0) {
          throw new ServiceException("credit_limit_exceeded", "Credit limit exceeded");
        }
      } else {
        const guard = await tx.account.updateMany({
          where: {
            id: input.accountId,
            userId,
            balanceCents: { gte: input.amountCents },
          },
          data: { balanceCents: { decrement: input.amountCents } },
        });
        if (guard.count === 0) {
          throw new ServiceException("insufficient_funds", "Insufficient funds");
        }
      }

      const updated = await tx.account.findUniqueOrThrow({
        where: { id: input.accountId },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          type: "withdrawal",
          amountCents: input.amountCents,
          description: input.description || "Withdrawal",
          category: categorize("withdrawal", input.description),
          status: "completed",
          reference: idemRef,
        },
      });

      await emitBalanceAlerts(tx, {
        userId,
        amountCents: input.amountCents,
        newBalanceCents: updated.balanceCents,
        accountLabel: account.nickname || account.number,
        isDebit: true,
      });

      return { account: updated, transactionId: transaction.id };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("withdrawFunds", err);
    return toFailure(err);
  }
}

/** Move money between two accounts owned by the same user. Always free. */
export async function transferInternal(
  userId: string,
  input: InternalTransferInput,
  client: PrismaClient = prisma,
): Promise<Result<TransferOutcome>> {
  const invalid = invalidAmount(input.amountCents);
  if (invalid) return invalid;
  const idemRef = normalizeIdempotencyRef(input.idempotencyKey);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const fromAccount = await tx.account.findFirst({
        where: { id: input.fromAccountId, userId },
      });
      if (!fromAccount) {
        throw new ServiceException("not_found", "Source account not found");
      }

      const toAccount = await tx.account.findFirst({
        where: { id: input.toAccountId, userId },
      });
      if (!toAccount) {
        throw new ServiceException("not_found", "Target account not found");
      }

      if (idemRef) {
        const existingTx = await tx.transaction.findFirst({
          where: {
            userId,
            accountId: input.fromAccountId,
            type: "transfer_out",
            reference: idemRef,
          },
        });
        if (existingTx) {
          return {
            amountCents: existingTx.amountCents,
            feeCents: 0,
            totalDebitedCents: existingTx.amountCents,
            fromAccountId: input.fromAccountId,
            targetAccountId: toAccount.id,
            targetAccountNumber: toAccount.number,
            balanceCents: fromAccount.balanceCents,
            transactionId: existingTx.id,
          };
        }
      }

      // Atomic guarded debit (prevents concurrent overdraw).
      const debit = await tx.account.updateMany({
        where: {
          id: input.fromAccountId,
          userId,
          balanceCents: { gte: input.amountCents },
        },
        data: { balanceCents: { decrement: input.amountCents } },
      });
      if (debit.count === 0) {
        throw new ServiceException(
          "insufficient_funds",
          "Insufficient funds in source account",
        );
      }

      const updatedFromAccount = await tx.account.findUniqueOrThrow({
        where: { id: input.fromAccountId },
      });

      await tx.account.update({
        where: { id: input.toAccountId },
        data: { balanceCents: { increment: input.amountCents } },
      });

      const outgoing = await tx.transaction.create({
        data: {
          userId,
          accountId: input.fromAccountId,
          targetAccountId: input.toAccountId,
          type: "transfer_out",
          amountCents: input.amountCents,
          description: `Transfer to ${toAccount.nickname || toAccount.number} - ${input.description || "Transfer"}`,
          category: "transfer",
          status: "completed",
          reference: idemRef,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId: input.toAccountId,
          targetAccountId: input.fromAccountId,
          type: "transfer_in",
          amountCents: input.amountCents,
          description: `Transfer from ${fromAccount.nickname || fromAccount.number} - ${input.description || "Transfer"}`,
          category: "income",
          status: "completed",
        },
      });

      const balanceCents = updatedFromAccount.balanceCents;
      await emitBalanceAlerts(tx, {
        userId,
        amountCents: input.amountCents,
        newBalanceCents: balanceCents,
        accountLabel: fromAccount.nickname || fromAccount.number,
        isDebit: true,
      });

      return {
        amountCents: input.amountCents,
        feeCents: 0,
        totalDebitedCents: input.amountCents,
        fromAccountId: input.fromAccountId,
        targetAccountId: toAccount.id,
        targetAccountNumber: toAccount.number,
        balanceCents,
        transactionId: outgoing.id,
      };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("transferInternal", err);
    return toFailure(err);
  }
}

/**
 * Send money to any account number.
 *
 * A flat fee applies when the money leaves the user (the destination belongs to
 * somebody else) and is posted as its own `fee` transaction, so the ledger stays
 * one row per movement. The destination lookup uses a single generic error for
 * both "not found" and "that's your own account" so the endpoint cannot be used
 * to enumerate account numbers.
 */
export async function transferExternal(
  userId: string,
  input: ExternalTransferInput,
  client: PrismaClient = prisma,
): Promise<Result<TransferOutcome>> {
  const invalid = invalidAmount(input.amountCents);
  if (invalid) return invalid;
  const idemRef = normalizeIdempotencyRef(input.idempotencyKey);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const fromAccount = await tx.account.findFirst({
        where: { id: input.fromAccountId, userId },
      });
      if (!fromAccount) {
        throw new ServiceException("not_found", "Source account not found");
      }

      const toAccount = await tx.account.findUnique({
        where: { number: input.targetAccountNumber },
        include: { user: { select: { id: true, name: true } } },
      });
      if (!toAccount || toAccount.id === fromAccount.id) {
        throw new ServiceException("invalid_destination", "Invalid destination account");
      }

      const feeCents = computeTransferFeeCents({
        sameUser: toAccount.userId === userId,
      });
      const totalDebitedCents = input.amountCents + feeCents;
      const targetName = toAccount.user?.name ?? "External";

      if (idemRef) {
        const existingTx = await tx.transaction.findFirst({
          where: {
            userId,
            accountId: input.fromAccountId,
            type: "transfer_out",
            reference: idemRef,
          },
        });
        if (existingTx) {
          return {
            amountCents: existingTx.amountCents,
            feeCents,
            totalDebitedCents: existingTx.amountCents + feeCents,
            fromAccountId: input.fromAccountId,
            targetAccountId: toAccount.id,
            targetAccountNumber: toAccount.number,
            balanceCents: fromAccount.balanceCents,
            transactionId: existingTx.id,
          };
        }
      }

      // Atomic guarded debit covering amount + fee (prevents concurrent overdraw).
      const debit = await tx.account.updateMany({
        where: {
          id: input.fromAccountId,
          userId,
          balanceCents: { gte: totalDebitedCents },
        },
        data: { balanceCents: { decrement: totalDebitedCents } },
      });
      if (debit.count === 0) {
        throw new ServiceException(
          "insufficient_funds",
          "Insufficient funds in source account",
        );
      }

      const updatedFromAccount = await tx.account.findUniqueOrThrow({
        where: { id: input.fromAccountId },
      });

      await tx.account.update({
        where: { id: toAccount.id },
        data: { balanceCents: { increment: input.amountCents } },
      });

      const outgoing = await tx.transaction.create({
        data: {
          userId,
          accountId: input.fromAccountId,
          targetAccountId: toAccount.id,
          type: "transfer_out",
          amountCents: input.amountCents,
          description: `Transfer to ${targetName} (${toAccount.number}) - ${input.description || "External Transfer"}`,
          category: "transfer",
          status: "completed",
          reference: idemRef,
        },
      });

      if (feeCents > 0) {
        await tx.transaction.create({
          data: {
            userId,
            accountId: input.fromAccountId,
            targetAccountId: toAccount.id,
            type: "fee",
            amountCents: feeCents,
            description: `External transfer fee (${toAccount.number})`,
            category: categorize("fee", null),
            status: "completed",
          },
        });
      }

      await tx.transaction.create({
        data: {
          userId: toAccount.userId,
          accountId: toAccount.id,
          targetAccountId: input.fromAccountId,
          type: "transfer_in",
          amountCents: input.amountCents,
          description: `Transfer from external account (${fromAccount.number}) - ${input.description || "External Transfer"}`,
          category: "income",
          status: "completed",
        },
      });

      // Alert sender (low balance) and notify recipient of incoming funds.
      const balanceCents = updatedFromAccount.balanceCents;
      await emitBalanceAlerts(tx, {
        userId,
        amountCents: input.amountCents,
        newBalanceCents: balanceCents,
        accountLabel: fromAccount.nickname || fromAccount.number,
        isDebit: true,
      });

      if (toAccount.userId !== userId) {
        await notify(
          tx,
          toAccount.userId,
          "info",
          "Money received",
          `You received ${formatCents(input.amountCents)} into ${toAccount.number}.`,
        );
      }

      return {
        amountCents: input.amountCents,
        feeCents,
        totalDebitedCents,
        fromAccountId: input.fromAccountId,
        targetAccountId: toAccount.id,
        targetAccountNumber: toAccount.number,
        balanceCents,
        transactionId: outgoing.id,
      };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("transferExternal", err);
    return toFailure(err);
  }
}

/**
 * Simulate a merchant purchase against one of the user's virtual cards.
 *
 * Enforces card freeze status, expiration timestamp, and `maxUses` quota
 * atomically with the account debit and increments `usageCount`.
 */
export async function simulateCardPurchase(
  userId: string,
  input: CardPurchaseInput,
  client: PrismaClient = prisma,
): Promise<Result<CardPurchaseOutcome>> {
  const invalid = invalidAmount(input.amountCents);
  if (invalid) return invalid;

  const merchant = input.merchant.trim();
  if (!merchant) {
    return fail("validation_error", "Merchant name is required");
  }
  const idemRef = normalizeIdempotencyRef(input.idempotencyKey);

  try {
    const outcome = await client.$transaction(async (tx) => {
      const card = await tx.virtualCard.findFirst({
        where: { id: input.cardId, userId },
      });
      if (!card) throw new ServiceException("not_found", "Card not found");

      const account = await tx.account.findFirst({
        where: { id: input.accountId, userId },
      });
      if (!account) throw new ServiceException("not_found", "Account not found");

      const last4 = card.cardNumber.slice(-4);

      if (idemRef) {
        const existingTx = await tx.transaction.findFirst({
          where: {
            userId,
            accountId: input.accountId,
            type: "withdrawal",
            reference: idemRef,
          },
        });
        if (existingTx) {
          return {
            account,
            transactionId: existingTx.id,
            usageCount: card.usageCount,
            last4,
          };
        }
      }

      if (card.isFrozen) {
        throw new ServiceException("conflict", "Card is frozen");
      }
      if (card.expiresAt && card.expiresAt.getTime() <= Date.now()) {
        throw new ServiceException("conflict", "Card has expired");
      }
      if (card.maxUses !== null && card.usageCount >= card.maxUses) {
        throw new ServiceException("conflict", "Card usage limit reached");
      }

      if (account.type === "credit") {
        const limitCents = account.creditLimitCents ?? DEFAULT_CREDIT_LIMIT_CENTS;
        const guard = await tx.account.updateMany({
          where: {
            id: input.accountId,
            userId,
            balanceCents: { gte: input.amountCents - limitCents },
          },
          data: { balanceCents: { decrement: input.amountCents } },
        });
        if (guard.count === 0) {
          throw new ServiceException("credit_limit_exceeded", "Credit limit exceeded");
        }
      } else {
        const guard = await tx.account.updateMany({
          where: {
            id: input.accountId,
            userId,
            balanceCents: { gte: input.amountCents },
          },
          data: { balanceCents: { decrement: input.amountCents } },
        });
        if (guard.count === 0) {
          throw new ServiceException("insufficient_funds", "Insufficient funds");
        }
      }

      const updatedCard = await tx.virtualCard.update({
        where: { id: card.id },
        data: { usageCount: { increment: 1 } },
      });

      const updatedAccount = await tx.account.findUniqueOrThrow({
        where: { id: input.accountId },
      });

      const description = `Card •••• ${last4} - ${merchant}`;
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: input.accountId,
          type: "withdrawal",
          amountCents: input.amountCents,
          description,
          category: categorize("withdrawal", merchant),
          status: "completed",
          reference: idemRef,
        },
      });

      await emitBalanceAlerts(tx, {
        userId,
        amountCents: input.amountCents,
        newBalanceCents: updatedAccount.balanceCents,
        accountLabel: account.nickname || account.number,
        isDebit: true,
      });

      return {
        account: updatedAccount,
        transactionId: transaction.id,
        usageCount: updatedCard.usageCount,
        last4,
      };
    });

    return ok(outcome);
  } catch (err) {
    logUnexpected("simulateCardPurchase", err);
    return toFailure(err);
  }
}
