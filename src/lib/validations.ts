import { z } from "zod";

// ── Auth ────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Account ─────────────────────────────────────────────
export const accountTypeSchema = z.enum(["checking", "savings", "credit"]);

export const createAccountSchema = z.object({
  type: accountTypeSchema,
});

// ── Transactions ────────────────────────────────────────

/**
 * A monetary amount: positive, capped, and limited to 2 decimal places.
 * `multipleOf(0.01)` rejects sub-cent values like 0.001 that would otherwise
 * introduce float dust into balances.
 */
export const amountSchema = z
  .number({ invalid_type_error: "Amount must be a number" })
  .positive("Amount must be positive")
  .max(9999999.99, "Amount is too large")
  .multipleOf(0.01, "Amount can have at most 2 decimal places");

const descriptionSchema = z
  .string()
  .max(200, "Description too long")
  .optional()
  .default("");

export const depositSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: amountSchema,
  description: descriptionSchema,
});

export const withdrawSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: amountSchema,
  description: descriptionSchema,
});

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Source account is required"),
    toAccountId: z.string().min(1, "Target account is required"),
    amount: amountSchema,
    description: descriptionSchema,
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Cannot transfer to the same account",
    path: ["toAccountId"],
  });

export const externalTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  targetAccountNumber: z
    .string()
    .min(1, "Target account number is required")
    .regex(
      /^(CHK|SAV|CRD|USR)-[A-Z0-9]{6}$/i,
      "Invalid account number format (e.g. CHK-A1B2C3)",
    ),
  amount: amountSchema,
  description: descriptionSchema,
});

// ── Profile ─────────────────────────────────────────────
export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Account nickname ────────────────────────────────────
export const accountNicknameSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  nickname: z
    .string()
    .max(40, "Nickname too long")
    .optional()
    .default(""),
});

// ── Beneficiaries ───────────────────────────────────────
export const beneficiarySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  accountNumber: z
    .string()
    .min(1, "Account number is required")
    .regex(
      /^(CHK|SAV|CRD|USR)-[A-Z0-9]{6}$/i,
      "Invalid account number format (e.g. CHK-A1B2C3)",
    ),
  nickname: z.string().max(40).optional().default(""),
});

// ── Savings goals ───────────────────────────────────────
export const savingsGoalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(80),
  targetAmount: amountSchema,
  accountId: z.string().min(1, "Linked account is required"),
  deadline: z.string().optional().default(""),
  color: z.string().max(20).optional().default("emerald"),
});

export const goalContributionSchema = z.object({
  goalId: z.string().min(1, "Goal is required"),
  amount: amountSchema,
});

// ── Recurring / scheduled transfers ─────────────────────
export const recurringFrequencySchema = z.enum([
  "daily",
  "weekly",
  "monthly",
]);

export const recurringTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  targetAccountNumber: z
    .string()
    .min(1, "Target account number is required")
    .regex(
      /^(CHK|SAV|CRD|USR)-[A-Z0-9]{6}$/i,
      "Invalid account number format (e.g. CHK-A1B2C3)",
    ),
  amount: amountSchema,
  frequency: recurringFrequencySchema,
  description: descriptionSchema,
  startDate: z.string().optional().default(""),
});

// ── Transaction categories ──────────────────────────────
export const TRANSACTION_CATEGORIES = [
  "income",
  "transfer",
  "food",
  "shopping",
  "bills",
  "transport",
  "entertainment",
  "health",
  "travel",
  "other",
] as const;

export const transactionCategorySchema = z.object({
  transactionId: z.string().min(1, "Transaction is required"),
  category: z.enum(TRANSACTION_CATEGORIES),
});

// ── Exported types ──────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawInput = z.infer<typeof withdrawSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type BeneficiaryInput = z.infer<typeof beneficiarySchema>;
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;
export type RecurringTransferInput = z.infer<typeof recurringTransferSchema>;
export type RecurringFrequency = z.infer<typeof recurringFrequencySchema>;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];
