"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createAccountSchema,
  depositSchema,
  withdrawSchema,
  transferSchema,
  externalTransferSchema,
  profileSchema,
  passwordSchema,
  registerSchema,
  accountNicknameSchema,
  beneficiarySchema,
  savingsGoalSchema,
  goalContributionSchema,
  recurringTransferSchema,
  transactionCategorySchema,
} from "@/lib/validations";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import type { Account } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { roundMoney, isEffectivelyZero } from "@/lib/money";
import { categorize } from "@/lib/categorize";
import { emitBalanceAlerts, notify } from "@/lib/notifications";

// ── Helpers ─────────────────────────────────────────────

function generateAccountNumber(type: string): string {
  const prefix =
    type === "checking" ? "CHK" : type === "savings" ? "SAV" : "CRD";
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

async function generateUniqueAccountNumber(type: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = generateAccountNumber(type);
    const exists = await prisma.account.findUnique({ where: { number } });
    if (!exists) return number;
  }
  throw new Error(
    "Failed to generate a unique account number. Please try again.",
  );
}

async function getAuthenticatedUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Verify the user still exists in the database (session may be stale
  // after a reseed). This also prevents FK constraint violations.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) {
    throw new Error("Session expired. Please sign out and sign in again.");
  }

  return session.user.id;
}

// ── Account Operations ──────────────────────────────────

export async function createAccount(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = createAccountSchema.safeParse({
      type: formData.get("type"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { type } = parsed.data;

    const account = await prisma.account.create({
      data: {
        userId,
        type,
        number: await generateUniqueAccountNumber(type),
        balance: 0,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, account };
  } catch (err) {
    console.error("createAccount error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Deposit ──────────────────────────────────────────────

export async function deposit(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = depositSchema.safeParse({
      accountId: formData.get("accountId"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { accountId, description } = parsed.data;
    const amount = roundMoney(parsed.data.amount);

    const updatedAccount = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) throw new Error("Account not found");

      const updated = await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId,
          type: "deposit",
          amount,
          description: description || "Deposit",
          category: categorize("deposit", description),
          status: "completed",
        },
      });

      await emitBalanceAlerts(tx, {
        userId,
        amount,
        newBalance: updated.balance,
        accountLabel: account.nickname || account.number,
        isDebit: false,
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/accounts/${accountId}`);
    return { success: true, account: updatedAccount };
  } catch (err) {
    console.error("deposit error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Withdraw ────────────────────────────────────────────

export async function withdraw(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = withdrawSchema.safeParse({
      accountId: formData.get("accountId"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { accountId, description } = parsed.data;
    const amount = roundMoney(parsed.data.amount);

    const updatedAccount = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) throw new Error("Account not found");

      // Atomic conditional decrement: the WHERE clause re-checks the balance
      // at write time so two concurrent withdrawals can't both pass an
      // earlier read (TOCTOU). `count === 0` means the guard failed.
      let guard;
      if (account.type === "credit") {
        const limit = account.creditLimit ?? 10000;
        // balance - amount >= -limit  ⇔  balance >= amount - limit
        guard = await tx.account.updateMany({
          where: { id: accountId, userId, balance: { gte: amount - limit } },
          data: { balance: { decrement: amount } },
        });
        if (guard.count === 0) throw new Error("Credit limit exceeded");
      } else {
        guard = await tx.account.updateMany({
          where: { id: accountId, userId, balance: { gte: amount } },
          data: { balance: { decrement: amount } },
        });
        if (guard.count === 0) throw new Error("Insufficient funds");
      }

      const updated = await tx.account.findUniqueOrThrow({
        where: { id: accountId },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId,
          type: "withdrawal",
          amount,
          description: description || "Withdrawal",
          category: categorize("withdrawal", description),
          status: "completed",
        },
      });

      await emitBalanceAlerts(tx, {
        userId,
        amount,
        newBalance: updated.balance,
        accountLabel: account.nickname || account.number,
        isDebit: true,
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/accounts/${accountId}`);
    return { success: true, account: updatedAccount };
  } catch (err) {
    console.error("withdraw error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Transfer ────────────────────────────────────────────

export async function transfer(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = transferSchema.safeParse({
      fromAccountId: formData.get("fromAccountId"),
      toAccountId: formData.get("toAccountId"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { fromAccountId, toAccountId, description } = parsed.data;
    const amount = roundMoney(parsed.data.amount);

    const txDescription = description || "Transfer";

    await prisma.$transaction(async (tx) => {
      const fromAccount = await tx.account.findFirst({
        where: { id: fromAccountId, userId },
      });
      if (!fromAccount) throw new Error("Source account not found");

      const toAccount = await tx.account.findFirst({
        where: { id: toAccountId, userId },
      });
      if (!toAccount) throw new Error("Target account not found");

      // Atomic guarded debit (prevents concurrent overdraw).
      const debit = await tx.account.updateMany({
        where: { id: fromAccountId, userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count === 0) {
        throw new Error("Insufficient funds in source account");
      }

      const updatedFrom = await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amount } },
      });
      void updatedFrom;

      await tx.transaction.create({
        data: {
          userId,
          accountId: fromAccountId,
          targetAccountId: toAccountId,
          type: "transfer_out",
          amount,
          description: `Transfer to ${toAccount.nickname || toAccount.number} - ${txDescription}`,
          category: "transfer",
          status: "completed",
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId: toAccountId,
          targetAccountId: fromAccountId,
          type: "transfer_in",
          amount,
          description: `Transfer from ${fromAccount.nickname || fromAccount.number} - ${txDescription}`,
          category: "income",
          status: "completed",
        },
      });

      const newFromBalance = roundMoney(fromAccount.balance - amount);
      await emitBalanceAlerts(tx, {
        userId,
        amount,
        newBalance: newFromBalance,
        accountLabel: fromAccount.nickname || fromAccount.number,
        isDebit: true,
      });
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/accounts/${fromAccountId}`);
    revalidatePath(`/dashboard/accounts/${toAccountId}`);
    return { success: true };
  } catch (err) {
    console.error("transfer error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── External Transfer (to any account by number) ─────────

export async function transferExternal(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = externalTransferSchema.safeParse({
      fromAccountId: formData.get("fromAccountId"),
      targetAccountNumber: formData.get("targetAccountNumber"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { fromAccountId, targetAccountNumber, description } = parsed.data;
    const amount = roundMoney(parsed.data.amount);

    const txDescription = description || "External Transfer";

    await prisma.$transaction(async (tx) => {
      const fromAccount = await tx.account.findFirst({
        where: { id: fromAccountId, userId },
      });
      if (!fromAccount) throw new Error("Source account not found");

      const toAccount = await tx.account.findUnique({
        where: { number: targetAccountNumber },
        include: { user: { select: { id: true, name: true } } },
      });
      // Generic message: do not reveal whether an account number exists,
      // and treat self-transfer the same way to avoid enumeration.
      if (!toAccount || toAccount.id === fromAccount.id)
        throw new Error("Invalid destination account");

      const targetName = toAccount.user?.name ?? "External";

      // Atomic guarded debit (prevents concurrent overdraw).
      const debit = await tx.account.updateMany({
        where: { id: fromAccountId, userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count === 0) {
        throw new Error("Insufficient funds in source account");
      }

      await tx.account.update({
        where: { id: toAccount.id },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId: fromAccountId,
          targetAccountId: toAccount.id,
          type: "transfer_out",
          amount,
          description: `Transfer to ${targetName} (${toAccount.number}) - ${txDescription}`,
          category: "transfer",
          status: "completed",
        },
      });

      await tx.transaction.create({
        data: {
          userId: toAccount.userId,
          accountId: toAccount.id,
          targetAccountId: fromAccountId,
          type: "transfer_in",
          amount,
          description: `Transfer from external account (${fromAccount.number}) - ${txDescription}`,
          category: "income",
          status: "completed",
        },
      });

      // Alert sender (low balance) and notify recipient of incoming funds.
      const newFromBalance = roundMoney(fromAccount.balance - amount);
      await emitBalanceAlerts(tx, {
        userId,
        amount,
        newBalance: newFromBalance,
        accountLabel: fromAccount.nickname || fromAccount.number,
        isDebit: true,
      });
      await notify(
        tx,
        toAccount.userId,
        "info",
        "Money received",
        `You received $${amount.toFixed(2)} into ${toAccount.number}.`,
      );
    });

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/accounts/${fromAccountId}`);
    return { success: true };
  } catch (err) {
    console.error("external transfer error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Profile ─────────────────────────────────────────────

export async function updateProfile(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
    });

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("updateProfile error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

export async function changePassword(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    // Rate-limit password changes per user to blunt brute-forcing the
    // current password from an authenticated session.
    const rate = checkRateLimit(`changePassword:${userId}`, {
      max: 5,
      windowMs: 15 * 60 * 1000,
      message: "Too many attempts. Please try again later.",
    });
    if (!rate.allowed) {
      return { error: rate.message ?? "Too many attempts. Try again later." };
    }

    const parsed = passwordSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "User not found" };

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return { error: "Current password is incorrect" };

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("changePassword error:", err);
    return {
      error:
        err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Delete Account ──────────────────────────────────────

export async function deleteAccount(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    const accountId = formData.get("accountId") as string;
    if (!accountId) return { error: "Account ID is required" };

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return { error: "Account not found" };
    if (!isEffectivelyZero(account.balance))
      return {
        error:
          "Cannot delete an account with a non-zero balance. Settle all funds first.",
      };

    await prisma.account.delete({ where: { id: accountId } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("deleteAccount error:", err);
    return { error: err instanceof Error ? err.message : "Unexpected error" };
  }
}

// ── Delete User ─────────────────────────────────────────

export async function deleteUserAccount(): Promise<{
  error?: string;
  success?: boolean;
}> {
  try {
    const userId = await getAuthenticatedUserId();

    // Check for credit debt
    const creditAccounts = await prisma.account.findMany({
      where: { userId, type: "credit" },
    });
    for (const acc of creditAccounts) {
      if (acc.balance < -0.005) {
        return { error: "deleteAccount.creditWarning" };
      }
    }

    // Delete all user data (cascading)
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (err) {
    console.error("deleteUserAccount error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Virtual Cards ───────────────────────────────────────

function generateCardNumber(): string {
  // Use rejection-free uniform digits (randomInt) to avoid the modulo bias
  // that `byte % 10` introduces.
  const digits = Array.from({ length: 16 }, () => randomInt(10)).join("");
  return digits.replace(/(\d{4})/g, "$1 ").trim();
}

function generateExpiry(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String((now.getFullYear() + 3) % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

function generateCVV(): string {
  return String(100 + randomInt(900));
}

export async function createVirtualCard(
  _prevState: { error?: string; card?: unknown } | null,
  formData: FormData,
): Promise<{ error?: string; card?: unknown }> {
  try {
    const userId = await getAuthenticatedUserId();
    const isTemporary = formData.get("isTemporary") === "true";
    const expiresDays = parseInt(formData.get("expiresDays") as string) || 0;
    const maxUses = parseInt(formData.get("maxUses") as string) || 0;

    const card = await prisma.virtualCard.create({
      data: {
        userId,
        cardNumber: generateCardNumber(),
        cardHolder: (formData.get("cardHolder") as string) || "Card Holder",
        expiryDate: generateExpiry(),
        cvv: generateCVV(),
        isTemporary,
        expiresAt:
          isTemporary && expiresDays > 0
            ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
            : null,
        maxUses: maxUses > 0 ? maxUses : null,
      },
    });

    revalidatePath("/dashboard/cards");
    return { card };
  } catch (err) {
    console.error("createVirtualCard error:", err);
    return { error: "Failed to create virtual card" };
  }
}

export async function toggleFreezeCard(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const cardId = formData.get("cardId") as string;
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) return { error: "Card not found" };

    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { isFrozen: !card.isFrozen },
    });

    revalidatePath("/dashboard/cards");
    return {};
  } catch (err) {
    console.error("toggleFreezeCard error:", err);
    return { error: "Failed to toggle card status" };
  }
}

export async function deleteVirtualCard(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const cardId = formData.get("cardId") as string;
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });
    if (!card) return { error: "Card not found" };

    await prisma.virtualCard.delete({ where: { id: cardId } });
    revalidatePath("/dashboard/cards");
    return {};
  } catch (err) {
    console.error("deleteVirtualCard error:", err);
    return { error: "Failed to delete card" };
  }
}

// ── Register ────────────────────────────────────────────

export async function register(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    // Rate limit registration by IP
    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersList.get("x-real-ip") ??
      "unknown";
    const rateCheck = checkRateLimit(`register:${ip}`, {
      max: 5,
      windowMs: 60 * 60 * 1000, // 5 registros por hora por IP
      message: "Too many registration attempts. Please try again later.",
    });
    if (!rateCheck.allowed) {
      return {
        error:
          rateCheck.message ??
          "Too many registration attempts. Please try again later.",
      };
    }

    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "An account with this email already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let accountNumber = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `USR-${randomBytes(3).toString("hex").toUpperCase()}`;
      const exists = await prisma.user.findUnique({
        where: { accountNumber: candidate },
      });
      if (!exists) {
        accountNumber = candidate;
        break;
      }
    }
    if (!accountNumber) {
      return {
        error: "Failed to generate a unique account number. Please try again.",
      };
    }

    await prisma.user.create({
      data: { name, email, passwordHash, accountNumber },
    });

    return { success: true };
  } catch (err) {
    console.error("register error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Account Nickname ────────────────────────────────────

export async function updateAccountNickname(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = accountNicknameSchema.safeParse({
      accountId: formData.get("accountId"),
      nickname: formData.get("nickname") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const { accountId, nickname } = parsed.data;

    const result = await prisma.account.updateMany({
      where: { id: accountId, userId },
      data: { nickname: nickname.trim() || null },
    });
    if (result.count === 0) return { error: "Account not found" };

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/accounts/${accountId}`);
    return { success: true };
  } catch (err) {
    console.error("updateAccountNickname error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Transaction Categorization ──────────────────────────

export async function updateTransactionCategory(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = transactionCategorySchema.safeParse({
      transactionId: formData.get("transactionId"),
      category: formData.get("category"),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const { transactionId, category } = parsed.data;

    const result = await prisma.transaction.updateMany({
      where: { id: transactionId, userId },
      data: { category },
    });
    if (result.count === 0) return { error: "Transaction not found" };

    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (err) {
    console.error("updateTransactionCategory error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Beneficiaries ───────────────────────────────────────

export async function addBeneficiary(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = beneficiarySchema.safeParse({
      name: formData.get("name"),
      accountNumber: formData.get("accountNumber"),
      nickname: formData.get("nickname") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const accountNumber = parsed.data.accountNumber.toUpperCase();

    // Prevent saving your own account as a beneficiary.
    const own = await prisma.account.findFirst({
      where: { number: accountNumber, userId },
      select: { id: true },
    });
    if (own) return { error: "This is one of your own accounts" };

    const existing = await prisma.beneficiary.findUnique({
      where: { userId_accountNumber: { userId, accountNumber } },
    });
    if (existing) return { error: "Beneficiary already saved" };

    await prisma.beneficiary.create({
      data: {
        userId,
        name: parsed.data.name,
        accountNumber,
        nickname: parsed.data.nickname || null,
      },
    });

    revalidatePath("/dashboard/beneficiaries");
    return { success: true };
  } catch (err) {
    console.error("addBeneficiary error:", err);
    return { error: "An unexpected error occurred" };
  }
}

export async function deleteBeneficiary(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const id = formData.get("id") as string;
    if (!id) return { error: "Beneficiary ID is required" };

    const result = await prisma.beneficiary.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) return { error: "Beneficiary not found" };

    revalidatePath("/dashboard/beneficiaries");
    return {};
  } catch (err) {
    console.error("deleteBeneficiary error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Savings Goals ───────────────────────────────────────

export async function createSavingsGoal(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = savingsGoalSchema.safeParse({
      name: formData.get("name"),
      targetAmount: Number(formData.get("targetAmount")),
      accountId: formData.get("accountId"),
      deadline: formData.get("deadline") || "",
      color: formData.get("color") || "emerald",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const { name, targetAmount, accountId, deadline, color } = parsed.data;

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true },
    });
    if (!account) return { error: "Linked account not found" };

    await prisma.savingsGoal.create({
      data: {
        userId,
        accountId,
        name,
        targetAmount: roundMoney(targetAmount),
        color: color || "emerald",
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    revalidatePath("/dashboard/goals");
    return { success: true };
  } catch (err) {
    console.error("createSavingsGoal error:", err);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Contribute funds to a savings goal. Moves money out of the linked account's
 * spendable balance (guarded debit) and tracks it against the goal.
 */
export async function contributeToGoal(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = goalContributionSchema.safeParse({
      goalId: formData.get("goalId"),
      amount: Number(formData.get("amount")),
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const { goalId } = parsed.data;
    const amount = roundMoney(parsed.data.amount);

    await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) throw new Error("Goal not found");

      const debit = await tx.account.updateMany({
        where: { id: goal.accountId, userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (debit.count === 0) throw new Error("Insufficient funds");

      const newAmount = roundMoney(goal.currentAmount + amount);
      const achieved = newAmount >= goal.targetAmount;
      await tx.savingsGoal.update({
        where: { id: goalId },
        data: {
          currentAmount: newAmount,
          achievedAt: achieved && !goal.achievedAt ? new Date() : goal.achievedAt,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          accountId: goal.accountId,
          type: "withdrawal",
          amount,
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
    });

    revalidatePath("/dashboard/goals");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("contributeToGoal error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

export async function deleteSavingsGoal(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const goalId = formData.get("goalId") as string;
    if (!goalId) return { error: "Goal ID is required" };

    // Return any saved funds back to the linked account before deleting.
    await prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.findFirst({
        where: { id: goalId, userId },
      });
      if (!goal) throw new Error("Goal not found");

      if (goal.currentAmount > 0) {
        await tx.account.update({
          where: { id: goal.accountId },
          data: { balance: { increment: roundMoney(goal.currentAmount) } },
        });
        await tx.transaction.create({
          data: {
            userId,
            accountId: goal.accountId,
            type: "deposit",
            amount: roundMoney(goal.currentAmount),
            description: `Refund from goal: ${goal.name}`,
            category: "income",
            status: "completed",
          },
        });
      }

      await tx.savingsGoal.delete({ where: { id: goalId } });
    });

    revalidatePath("/dashboard/goals");
    revalidatePath("/dashboard");
    return {};
  } catch (err) {
    console.error("deleteSavingsGoal error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Recurring / Scheduled Transfers ─────────────────────

function computeNextRun(from: Date, frequency: string): Date {
  const next = new Date(from);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  else if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1); // monthly
  return next;
}

export async function createRecurringTransfer(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = recurringTransferSchema.safeParse({
      fromAccountId: formData.get("fromAccountId"),
      targetAccountNumber: formData.get("targetAccountNumber"),
      amount: Number(formData.get("amount")),
      frequency: formData.get("frequency"),
      description: formData.get("description") || "",
      startDate: formData.get("startDate") || "",
    });
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message ?? "Invalid input" };
    }
    const { fromAccountId, frequency, description } = parsed.data;
    const targetAccountNumber = parsed.data.targetAccountNumber.toUpperCase();
    const amount = roundMoney(parsed.data.amount);

    const from = await prisma.account.findFirst({
      where: { id: fromAccountId, userId },
      select: { id: true },
    });
    if (!from) return { error: "Source account not found" };

    const target = await prisma.account.findUnique({
      where: { number: targetAccountNumber },
      select: { id: true },
    });
    if (!target) return { error: "Invalid destination account" };

    const startDate = parsed.data.startDate
      ? new Date(parsed.data.startDate)
      : new Date();

    await prisma.recurringTransfer.create({
      data: {
        userId,
        fromAccountId,
        targetAccountNumber,
        amount,
        frequency,
        description: description || null,
        nextRunAt: startDate,
      },
    });

    revalidatePath("/dashboard/scheduled");
    return { success: true };
  } catch (err) {
    console.error("createRecurringTransfer error:", err);
    return { error: "An unexpected error occurred" };
  }
}

export async function toggleRecurringTransfer(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const id = formData.get("id") as string;
    const current = await prisma.recurringTransfer.findFirst({
      where: { id, userId },
    });
    if (!current) return { error: "Scheduled transfer not found" };

    await prisma.recurringTransfer.update({
      where: { id },
      data: { active: !current.active },
    });
    revalidatePath("/dashboard/scheduled");
    return {};
  } catch (err) {
    console.error("toggleRecurringTransfer error:", err);
    return { error: "An unexpected error occurred" };
  }
}

export async function deleteRecurringTransfer(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const userId = await getAuthenticatedUserId();
    const id = formData.get("id") as string;
    const result = await prisma.recurringTransfer.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) return { error: "Scheduled transfer not found" };
    revalidatePath("/dashboard/scheduled");
    return {};
  } catch (err) {
    console.error("deleteRecurringTransfer error:", err);
    return { error: "An unexpected error occurred" };
  }
}

/**
 * Execute all due recurring transfers for the current user. Designed to be
 * callable on demand (e.g. dashboard load or a "Run now" button) and is
 * cron-ready. Each due rule runs atomically; failures (e.g. insufficient
 * funds) skip that rule and record a notification rather than aborting all.
 */
export async function runDueRecurringTransfers(): Promise<{
  executed: number;
  skipped: number;
}> {
  let executed = 0;
  let skipped = 0;
  try {
    const userId = await getAuthenticatedUserId();
    const now = new Date();
    const due = await prisma.recurringTransfer.findMany({
      where: { userId, active: true, nextRunAt: { lte: now } },
    });

    for (const rule of due) {
      try {
        await prisma.$transaction(async (tx) => {
          const fromAccount = await tx.account.findFirst({
            where: { id: rule.fromAccountId, userId },
          });
          if (!fromAccount) throw new Error("Source account missing");

          const toAccount = await tx.account.findUnique({
            where: { number: rule.targetAccountNumber },
          });
          if (!toAccount || toAccount.id === fromAccount.id)
            throw new Error("Invalid destination");

          const amount = roundMoney(rule.amount);
          const debit = await tx.account.updateMany({
            where: { id: rule.fromAccountId, userId, balance: { gte: amount } },
            data: { balance: { decrement: amount } },
          });
          if (debit.count === 0) throw new Error("Insufficient funds");

          await tx.account.update({
            where: { id: toAccount.id },
            data: { balance: { increment: amount } },
          });

          const desc = rule.description || "Scheduled transfer";
          await tx.transaction.create({
            data: {
              userId,
              accountId: rule.fromAccountId,
              targetAccountId: toAccount.id,
              type: "transfer_out",
              amount,
              description: `${desc} → ${toAccount.number}`,
              category: "transfer",
              status: "completed",
            },
          });
          await tx.transaction.create({
            data: {
              userId: toAccount.userId,
              accountId: toAccount.id,
              targetAccountId: rule.fromAccountId,
              type: "transfer_in",
              amount,
              description: `Scheduled transfer from ${fromAccount.number}`,
              category: "income",
              status: "completed",
            },
          });

          await tx.recurringTransfer.update({
            where: { id: rule.id },
            data: {
              lastRunAt: now,
              nextRunAt: computeNextRun(rule.nextRunAt, rule.frequency),
            },
          });

          await notify(
            tx,
            userId,
            "scheduled",
            "Scheduled transfer sent",
            `$${amount.toFixed(2)} sent to ${toAccount.number}.`,
          );
        });
        executed++;
      } catch (e) {
        skipped++;
        // Push the next run forward so we don't retry-spam a failing rule,
        // and let the user know it was skipped.
        await prisma.recurringTransfer
          .update({
            where: { id: rule.id },
            data: { nextRunAt: computeNextRun(rule.nextRunAt, rule.frequency) },
          })
          .catch(() => {});
        await prisma.notification
          .create({
            data: {
              userId,
              type: "scheduled",
              title: "Scheduled transfer skipped",
              body: `A scheduled transfer of $${rule.amount.toFixed(2)} could not be completed (${e instanceof Error ? e.message : "error"}).`,
            },
          })
          .catch(() => {});
      }
    }

    // The dashboard layout calls this during render; its page queries run after
    // this mutation, so revalidatePath is neither needed nor valid here.
  } catch (err) {
    console.error("runDueRecurringTransfers error:", err);
  }
  return { executed, skipped };
}

// ── Notifications ───────────────────────────────────────

export async function markNotificationsRead(): Promise<{ success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("markNotificationsRead error:", err);
    return {};
  }
}

export async function clearNotifications(): Promise<{ success?: boolean }> {
  try {
    const userId = await getAuthenticatedUserId();
    await prisma.notification.deleteMany({ where: { userId } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("clearNotifications error:", err);
    return {};
  }
}

// ── Notification Preferences ────────────────────────────

export async function updateNotificationPrefs(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    const notifyLowBalance = formData.get("notifyLowBalance") === "true";
    const notifyLargeTx = formData.get("notifyLargeTx") === "true";
    const lowBalanceThreshold = Math.max(
      0,
      roundMoney(Number(formData.get("lowBalanceThreshold")) || 0),
    );
    const largeTxThreshold = Math.max(
      0,
      roundMoney(Number(formData.get("largeTxThreshold")) || 0),
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        notifyLowBalance,
        notifyLargeTx,
        lowBalanceThreshold,
        largeTxThreshold,
      },
    });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("updateNotificationPrefs error:", err);
    return { error: "An unexpected error occurred" };
  }
}
