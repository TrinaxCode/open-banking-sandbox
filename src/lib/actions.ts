"use server";

/**
 * Server actions — the FormData adapter layer.
 *
 * Each action does exactly three things: validate the payload with Zod, call a
 * service from `src/lib/services/*`, and revalidate the affected paths. The
 * business rules live in the services, so a caller only has to adapt the shape
 * of the result (a form wants `{ error }`, a job wants a summary).
 */

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { fromCents, toCents } from "@/lib/money";
import { serializeAccount } from "@/lib/serialize";
import {
  accountNicknameSchema,
  beneficiarySchema,
  cardPurchaseSchema,
  createAccountSchema,
  depositSchema,
  externalTransferSchema,
  goalContributionSchema,
  notificationPrefsSchema,
  passwordSchema,
  profileSchema,
  recurringTransferSchema,
  registerSchema,
  savingsGoalSchema,
  transactionCategorySchema,
  transactionFilterSchema,
  categoryBudgetSchema,
  deleteCategoryBudgetSchema,
  transactionNotesSchema,
  transferSchema,
  withdrawSchema,
  firstIssue,
} from "@/lib/validations";
import {
  createAccountForUser,
  deleteAccountForUser,
  updateAccountNickname as updateAccountNicknameService,
} from "@/lib/services/accounts";
import {
  depositFunds,
  simulateCardPurchase,
  transferExternal as transferExternalService,
  transferInternal,
  withdrawFunds,
} from "@/lib/services/payments";
import {
  contributeToGoal as contributeToGoalService,
  createGoal,
  deleteGoal,
} from "@/lib/services/goals";
import {
  createRecurringTransfer as createRecurringTransferService,
  deleteRecurringTransfer as deleteRecurringTransferService,
  toggleRecurringTransfer as toggleRecurringTransferService,
} from "@/lib/services/recurring";
import { buildTransactionsCsv } from "@/lib/services/transactions";
import {
  setCategoryBudget as setCategoryBudgetService,
  deleteCategoryBudget as deleteCategoryBudgetService,
} from "@/lib/services/budgets";
import { recordSecurityEvent } from "@/lib/services/security";

// ── Helpers ─────────────────────────────────────────────

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

function revalidateAccount(accountId: string): void {
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/accounts/${accountId}`);
}

// ── Account Operations ──────────────────────────────────

export async function createAccount(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = createAccountSchema.safeParse({
      type: formData.get("type"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await createAccountForUser(userId, parsed.data.type);
    if (!result.ok) return { error: result.message };

    await recordSecurityEvent(
      userId,
      "account_created",
      `Opened ${result.data.type} account (${result.data.number})`,
    ).catch(() => {});

    revalidatePath("/dashboard");
    return { success: true, account: serializeAccount(result.data) };
  } catch (err) {
    console.error("createAccount error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
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
      idempotencyKey: (formData.get("idempotencyKey") as string) || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await depositFunds(userId, {
      accountId: parsed.data.accountId,
      amountCents: toCents(parsed.data.amount),
      description: parsed.data.description,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!result.ok) return { error: result.message };

    revalidateAccount(parsed.data.accountId);
    return { success: true, account: serializeAccount(result.data.account) };
  } catch (err) {
    console.error("deposit error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Withdraw ─────────────────────────────────────────────

export async function withdraw(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = withdrawSchema.safeParse({
      accountId: formData.get("accountId"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
      idempotencyKey: (formData.get("idempotencyKey") as string) || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await withdrawFunds(userId, {
      accountId: parsed.data.accountId,
      amountCents: toCents(parsed.data.amount),
      description: parsed.data.description,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!result.ok) return { error: result.message };

    revalidateAccount(parsed.data.accountId);
    return { success: true, account: serializeAccount(result.data.account) };
  } catch (err) {
    console.error("withdraw error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Transfer ─────────────────────────────────────────────

export async function transfer(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = transferSchema.safeParse({
      fromAccountId: formData.get("fromAccountId"),
      toAccountId: formData.get("toAccountId"),
      amount: Number(formData.get("amount")),
      description: formData.get("description") || "",
      idempotencyKey: (formData.get("idempotencyKey") as string) || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await transferInternal(userId, {
      fromAccountId: parsed.data.fromAccountId,
      toAccountId: parsed.data.toAccountId,
      amountCents: toCents(parsed.data.amount),
      description: parsed.data.description,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!result.ok) return { error: result.message };

    revalidateAccount(parsed.data.fromAccountId);
    revalidatePath(`/dashboard/accounts/${parsed.data.toAccountId}`);
    await recordSecurityEvent(
      userId,
      "transfer",
      `Internal transfer of $${parsed.data.amount.toFixed(2)} between accounts`,
    ).catch(() => {});
    return { success: true };
  } catch (err) {
    console.error("transfer error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
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
      idempotencyKey: (formData.get("idempotencyKey") as string) || undefined,
      confirmPassword: (formData.get("confirmPassword") as string) || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const amountCents = toCents(parsed.data.amount);
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, largeTxThresholdCents: true },
    });
    if (
      sender &&
      sender.largeTxThresholdCents > 0 &&
      amountCents >= sender.largeTxThresholdCents
    ) {
      if (!parsed.data.confirmPassword) {
        return { error: "Password confirmation is required for high-value transfers" };
      }
      const valid = await bcrypt.compare(
        parsed.data.confirmPassword,
        sender.passwordHash,
      );
      if (!valid) {
        await recordSecurityEvent(
          userId,
          "step_up_failed",
          `Failed step-up verification for high-value external transfer of $${parsed.data.amount.toFixed(2)}`,
        ).catch(() => {});
        return { error: "Incorrect password for high-value transfer verification" };
      }
    }

    const result = await transferExternalService(userId, {
      fromAccountId: parsed.data.fromAccountId,
      targetAccountNumber: parsed.data.targetAccountNumber,
      amountCents,
      description: parsed.data.description,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!result.ok) return { error: result.message };

    revalidateAccount(parsed.data.fromAccountId);
    await recordSecurityEvent(
      userId,
      "transfer",
      `External transfer of $${parsed.data.amount.toFixed(2)} to ${parsed.data.targetAccountNumber}`,
    ).catch(() => {});
    return {
      success: true,
      feeCents: result.data.feeCents,
      totalDebitedCents: result.data.totalDebitedCents,
    };
  } catch (err) {
    console.error("external transfer error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
    });

    await recordSecurityEvent(
      userId,
      "profile_updated",
      `Display name updated to ${parsed.data.name}`,
    ).catch(() => {});

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("updateProfile error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

export async function changePassword(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    // Rate-limit password changes per user to blunt brute-forcing the
    // current password from an authenticated session.
    const rate = await checkRateLimit(`changePassword:${userId}`, {
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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

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

    await recordSecurityEvent(
      userId,
      "password_change",
      "Account security password was changed",
    ).catch(() => {});

    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("changePassword error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
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

    const result = await deleteAccountForUser(userId, accountId);
    if (!result.ok) return { error: result.message };

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

    // Refuse to delete the user while a credit line still carries debt.
    const creditAccounts = await prisma.account.findMany({
      where: { userId, type: "credit" },
    });
    for (const account of creditAccounts) {
      if (account.balanceCents < 0) {
        return { error: "deleteAccount.creditWarning" };
      }
    }

    // Delete all user data (cascading)
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  } catch (err) {
    console.error("deleteUserAccount error:", err);
    return { error: "auth.genericError" };
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

    const currentCardCount = await prisma.virtualCard.count({ where: { userId } });
    if (currentCardCount >= 10) {
      return { error: "Maximum limit of 10 virtual cards reached" };
    }

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

    await recordSecurityEvent(
      userId,
      "card_created",
      `Virtual card ending in ${card.cardNumber.slice(-4)} created`,
    ).catch(() => {});

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

    const newFrozenState = !card.isFrozen;
    await prisma.virtualCard.update({
      where: { id: cardId },
      data: { isFrozen: newFrozenState },
    });

    await recordSecurityEvent(
      userId,
      newFrozenState ? "card_frozen" : "card_unfrozen",
      `Virtual card ending in ${card.cardNumber.slice(-4)} was ${newFrozenState ? "frozen" : "unfrozen"}`,
    ).catch(() => {});

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

export async function simulateVirtualCardPurchase(formData: FormData): Promise<{
  error?: string;
  success?: boolean;
  usageCount?: number;
}> {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = cardPurchaseSchema.safeParse({
      cardId: formData.get("cardId"),
      accountId: formData.get("accountId"),
      amount: Number(formData.get("amount")),
      merchant: formData.get("merchant") || "",
      idempotencyKey: (formData.get("idempotencyKey") as string) || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await simulateCardPurchase(userId, {
      cardId: parsed.data.cardId,
      accountId: parsed.data.accountId,
      amountCents: toCents(parsed.data.amount),
      merchant: parsed.data.merchant,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    if (!result.ok) return { error: result.message };

    await recordSecurityEvent(
      userId,
      "card_purchase",
      `Card •••• ${result.data.last4} charged $${parsed.data.amount.toFixed(2)} at ${parsed.data.merchant}`,
    ).catch(() => {});

    revalidateAccount(parsed.data.accountId);
    revalidatePath("/dashboard/cards");
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/dashboard/budgets");
    return { success: true, usageCount: result.data.usageCount };
  } catch (err) {
    console.error("simulateVirtualCardPurchase error:", err);
    return {
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

// ── Personal Data Portability (GDPR Export) ─────────────

export async function exportPersonalData(): Promise<{
  json?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const userId = await getAuthenticatedUserId();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: { orderBy: { createdAt: "asc" } },
        virtualCards: { orderBy: { createdAt: "desc" } },
        beneficiaries: { orderBy: { createdAt: "desc" } },
        savingsGoals: { orderBy: { createdAt: "desc" } },
        recurringTransfers: { orderBy: { createdAt: "desc" } },
        categoryBudgets: { orderBy: { category: "asc" } },
        transactions: { orderBy: { createdAt: "desc" }, take: 1000 },
        securityLogs: { orderBy: { createdAt: "desc" }, take: 200 },
      },
    });
    if (!user) return { error: "User not found" };

    const payload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        accountNumber: user.accountNumber,
        createdAt: user.createdAt.toISOString(),
        preferences: {
          notifyLowBalance: user.notifyLowBalance,
          lowBalanceThreshold: fromCents(user.lowBalanceThresholdCents),
          notifyLargeTx: user.notifyLargeTx,
          largeTxThreshold: fromCents(user.largeTxThresholdCents),
        },
      },
      accounts: user.accounts.map((a) => ({
        id: a.id,
        number: a.number,
        type: a.type,
        nickname: a.nickname,
        balance: fromCents(a.balanceCents),
        balanceCents: a.balanceCents,
        creditLimit: a.creditLimitCents !== null ? fromCents(a.creditLimitCents) : null,
        interestRate: a.interestRate,
        createdAt: a.createdAt.toISOString(),
      })),
      virtualCards: user.virtualCards.map((c) => ({
        id: c.id,
        maskedNumber: `•••• •••• •••• ${c.cardNumber.slice(-4)}`,
        cardHolder: c.cardHolder,
        expiryDate: c.expiryDate,
        isFrozen: c.isFrozen,
        isTemporary: c.isTemporary,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        maxUses: c.maxUses,
        usageCount: c.usageCount,
        createdAt: c.createdAt.toISOString(),
      })),
      beneficiaries: user.beneficiaries.map((b) => ({
        name: b.name,
        accountNumber: b.accountNumber,
        nickname: b.nickname,
        createdAt: b.createdAt.toISOString(),
      })),
      savingsGoals: user.savingsGoals.map((g) => ({
        name: g.name,
        targetAmount: fromCents(g.targetAmountCents),
        currentAmount: fromCents(g.currentAmountCents),
        deadline: g.deadline?.toISOString() ?? null,
        achievedAt: g.achievedAt?.toISOString() ?? null,
      })),
      recurringTransfers: user.recurringTransfers.map((r) => ({
        targetAccountNumber: r.targetAccountNumber,
        amount: fromCents(r.amountCents),
        frequency: r.frequency,
        description: r.description,
        active: r.active,
        nextRunAt: r.nextRunAt.toISOString(),
      })),
      categoryBudgets: user.categoryBudgets.map((b) => ({
        category: b.category,
        monthlyLimit: fromCents(b.amountCents),
      })),
      transactions: user.transactions.map((tx) => ({
        id: tx.id,
        accountId: tx.accountId,
        type: tx.type,
        category: tx.category,
        amount: fromCents(tx.amountCents),
        amountCents: tx.amountCents,
        description: tx.description,
        notes: tx.notes,
        reference: tx.reference,
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
      })),
      securityLogs: user.securityLogs.map((log) => ({
        action: log.action,
        details: log.details,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
    };

    await recordSecurityEvent(
      userId,
      "data_exported",
      "Exported personal account and ledger archive (JSON)",
    ).catch(() => {});

    revalidatePath("/dashboard/profile");
    return {
      json: JSON.stringify(payload, null, 2),
      filename: `trinaxbank-data-${user.accountNumber.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`,
    };
  } catch (err) {
    console.error("exportPersonalData error:", err);
    return { error: "An unexpected error occurred" };
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
    const rateCheck = await checkRateLimit(`register:${ip}`, {
      max: 5,
      windowMs: 60 * 60 * 1000, // 5 registros por hora por IP
      message: "Too many registration attempts. Please try again later.",
    });
    if (!rateCheck.allowed) {
      return {
        error:
          rateCheck.message ?? "Too many registration attempts. Please try again later.",
      };
    }

    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await updateAccountNicknameService(
      userId,
      parsed.data.accountId,
      parsed.data.nickname,
    );
    if (!result.ok) return { error: result.message };

    revalidateAccount(parsed.data.accountId);
    return { success: true };
  } catch (err) {
    console.error("updateAccountNickname error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Transaction History ─────────────────────────────────

export async function updateTransactionCategory(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    const parsed = transactionCategorySchema.safeParse({
      transactionId: formData.get("transactionId"),
      category: formData.get("category"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await prisma.transaction.updateMany({
      where: { id: parsed.data.transactionId, userId },
      data: { category: parsed.data.category },
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

/** Build a CSV of the filtered history (bounded) and hand it to the browser. */
export async function exportTransactions(formData: FormData): Promise<{
  csv?: string;
  count?: number;
  error?: string;
}> {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = transactionFilterSchema.safeParse({
      type: formData.get("type") || undefined,
      category: formData.get("category") || undefined,
      q: formData.get("q") || undefined,
      from: formData.get("from") || undefined,
      to: formData.get("to") || undefined,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const { csv, count } = await buildTransactionsCsv(userId, parsed.data);
    return { csv, count };
  } catch (err) {
    console.error("exportTransactions error:", err);
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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const { name, accountNumber, nickname } = parsed.data;

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
        name,
        accountNumber,
        nickname: nickname || null,
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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await createGoal(userId, {
      name: parsed.data.name,
      targetAmountCents: toCents(parsed.data.targetAmount),
      accountId: parsed.data.accountId,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      color: parsed.data.color,
    });
    if (!result.ok) return { error: result.message };

    revalidatePath("/dashboard/goals");
    return { success: true };
  } catch (err) {
    console.error("createSavingsGoal error:", err);
    return { error: "An unexpected error occurred" };
  }
}

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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await contributeToGoalService(
      userId,
      parsed.data.goalId,
      toCents(parsed.data.amount),
    );
    if (!result.ok) return { error: result.message };

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

    const result = await deleteGoal(userId, goalId);
    if (!result.ok) return { error: result.message };

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
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await createRecurringTransferService(userId, {
      fromAccountId: parsed.data.fromAccountId,
      targetAccountNumber: parsed.data.targetAccountNumber,
      amountCents: toCents(parsed.data.amount),
      frequency: parsed.data.frequency,
      description: parsed.data.description,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    });
    if (!result.ok) return { error: result.message };

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

    const result = await toggleRecurringTransferService(userId, id);
    if (!result.ok) return { error: result.message };

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

    const result = await deleteRecurringTransferService(userId, id);
    if (!result.ok) return { error: result.message };

    revalidatePath("/dashboard/scheduled");
    return {};
  } catch (err) {
    console.error("deleteRecurringTransfer error:", err);
    return { error: "An unexpected error occurred" };
  }
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

    const parsed = notificationPrefsSchema.safeParse({
      notifyLowBalance: formData.get("notifyLowBalance") === "true",
      notifyLargeTx: formData.get("notifyLargeTx") === "true",
      lowBalanceThreshold: Number(formData.get("lowBalanceThreshold")) || 0,
      largeTxThreshold: Number(formData.get("largeTxThreshold")) || 0,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    await prisma.user.update({
      where: { id: userId },
      data: {
        notifyLowBalance: parsed.data.notifyLowBalance,
        notifyLargeTx: parsed.data.notifyLargeTx,
        lowBalanceThresholdCents: toCents(parsed.data.lowBalanceThreshold),
        largeTxThresholdCents: toCents(parsed.data.largeTxThreshold),
      },
    });
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch (err) {
    console.error("updateNotificationPrefs error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Category Budgets ───────────────────────────────────

export async function setBudget(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = categoryBudgetSchema.safeParse({
      category: formData.get("category"),
      amount: Number(formData.get("amount")),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await setCategoryBudgetService(
      userId,
      parsed.data.category,
      toCents(parsed.data.amount),
    );
    if (!result.ok) return { error: result.message };

    revalidatePath("/dashboard/budgets");
    revalidatePath("/dashboard");
    return { success: true, budget: result.data };
  } catch (err) {
    console.error("setBudget error:", err);
    return { error: "An unexpected error occurred" };
  }
}

export async function deleteBudget(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = deleteCategoryBudgetSchema.safeParse({
      category: formData.get("category"),
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await deleteCategoryBudgetService(userId, parsed.data.category);
    if (!result.ok) return { error: result.message };

    revalidatePath("/dashboard/budgets");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("deleteBudget error:", err);
    return { error: "An unexpected error occurred" };
  }
}

// ── Transaction Notes ───────────────────────────────────

export async function updateTransactionNotes(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();

    const parsed = transactionNotesSchema.safeParse({
      transactionId: formData.get("transactionId"),
      notes: formData.get("notes") || "",
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };

    const result = await prisma.transaction.updateMany({
      where: { id: parsed.data.transactionId, userId },
      data: { notes: parsed.data.notes.trim() || null },
    });
    if (result.count === 0) return { error: "Transaction not found" };

    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("updateTransactionNotes error:", err);
    return { error: "An unexpected error occurred" };
  }
}
