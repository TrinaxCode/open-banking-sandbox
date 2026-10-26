import { z } from "zod";
import {
  ACCOUNT_NUMBER_PATTERN,
  ACCOUNT_TYPES,
  RECURRING_FREQUENCIES,
  TRANSACTION_CATEGORIES,
  TRANSACTION_TYPES,
} from "@/lib/domain";
import { MAX_TRANSACTION_CENTS } from "@/lib/money";

/**
 * Validation schemas.
 *
 * Value sets come from `src/lib/domain.ts`, so the allowed account types,
 * transaction types and categories have exactly one definition. Amounts exist in
 * two units and both are validated here:
 *   - `amountSchema` — decimal currency units, as typed in the UI ($12.34).
 *   - `amountCentsSchema` — integer cents, as stored and moved by the services.
 */

const MAX_AMOUNT_DECIMAL = MAX_TRANSACTION_CENTS / 100;

// ── Auth ────────────────────────────────────────────────

/**
 * Policy for passwords being *chosen* (registration, password change). Login
 * intentionally keeps the old 6-character floor so accounts created before the
 * policy was raised can still sign in.
 */
export const MIN_NEW_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt silently truncates beyond 72 bytes

function newPasswordRule(label: string) {
  return z
    .string()
    .min(
      MIN_NEW_PASSWORD_LENGTH,
      `${label} must be at least ${MIN_NEW_PASSWORD_LENGTH} characters`,
    )
    .max(
      MAX_PASSWORD_LENGTH,
      `${label} must be at most ${MAX_PASSWORD_LENGTH} characters`,
    );
}

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Please enter a valid email address"),
    password: newPasswordRule("Password"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ── Account ─────────────────────────────────────────────
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export const createAccountSchema = z.object({
  type: accountTypeSchema,
});

export const accountNumberSchema = z
  .string()
  .min(1, "Account number is required")
  .regex(ACCOUNT_NUMBER_PATTERN, "Invalid account number format (e.g. CHK-A1B2C3)")
  .transform((value) => value.toUpperCase());

// ── Money ───────────────────────────────────────────────

/**
 * A decimal amount: positive, capped, and limited to 2 decimal places.
 * `multipleOf(0.01)` rejects sub-cent values like 0.001 that would otherwise
 * introduce precision dust once converted to cents.
 */
export const amountSchema = z
  .number({ invalid_type_error: "Amount must be a number" })
  .positive("Amount must be positive")
  .max(MAX_AMOUNT_DECIMAL, "Amount is too large")
  .multipleOf(0.01, "Amount can have at most 2 decimal places");

/** The same constraints expressed in integer cents (the storage unit). */
export const amountCentsSchema = z
  .number({ invalid_type_error: "amountCents must be a number" })
  .int("amountCents must be a whole number of cents")
  .positive("Amount must be positive")
  .max(MAX_TRANSACTION_CENTS, "Amount is too large");

const descriptionSchema = z
  .string()
  .max(200, "Description too long")
  .optional()
  .default("");

const idempotencyKeySchema = z
  .string()
  .trim()
  .max(120, "Idempotency key too long")
  .optional();

export const depositSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: amountSchema,
  description: descriptionSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const withdrawSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  amount: amountSchema,
  description: descriptionSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const transferSchema = z
  .object({
    fromAccountId: z.string().min(1, "Source account is required"),
    toAccountId: z.string().min(1, "Target account is required"),
    amount: amountSchema,
    description: descriptionSchema,
    idempotencyKey: idempotencyKeySchema,
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Cannot transfer to the same account",
    path: ["toAccountId"],
  });

export const externalTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  targetAccountNumber: accountNumberSchema,
  amount: amountSchema,
  description: descriptionSchema,
  idempotencyKey: idempotencyKeySchema,
  confirmPassword: z.string().optional(),
});

export const cardPurchaseSchema = z.object({
  cardId: z.string().min(1, "Card is required"),
  accountId: z.string().min(1, "Account is required"),
  amount: amountSchema,
  merchant: z
    .string()
    .trim()
    .min(1, "Merchant name is required")
    .max(120, "Merchant name too long"),
  idempotencyKey: idempotencyKeySchema,
});

// ── Profile ─────────────────────────────────────────────
export const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: newPasswordRule("New password"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const notificationPrefsSchema = z.object({
  notifyLowBalance: z.boolean(),
  notifyLargeTx: z.boolean(),
  lowBalanceThreshold: amountSchema.or(z.literal(0)),
  largeTxThreshold: amountSchema.or(z.literal(0)),
});

// ── Account nickname ────────────────────────────────────
export const accountNicknameSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  nickname: z.string().max(40, "Nickname too long").optional().default(""),
});

// ── Beneficiaries ───────────────────────────────────────
export const beneficiarySchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  accountNumber: accountNumberSchema,
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
export const recurringFrequencySchema = z.enum(RECURRING_FREQUENCIES);

export const recurringTransferSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  targetAccountNumber: accountNumberSchema,
  amount: amountSchema,
  frequency: recurringFrequencySchema,
  description: descriptionSchema,
  startDate: z.string().optional().default(""),
});

// ── Transaction history ─────────────────────────────────
export const transactionCategorySchema = z.object({
  transactionId: z.string().min(1, "Transaction is required"),
  category: z.enum(TRANSACTION_CATEGORIES),
});

/** Filters accepted by the history page (parsed from the URL). */
export const transactionFilterSchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.enum(TRANSACTION_CATEGORIES).optional(),
  q: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ── Category Budgets ───────────────────────────────────
export const categoryBudgetSchema = z.object({
  category: z.enum(TRANSACTION_CATEGORIES).refine((cat) => cat !== "income", {
    message: "Income cannot have an expenditure budget",
  }),
  amount: amountSchema,
});

export const deleteCategoryBudgetSchema = z.object({
  category: z.enum(TRANSACTION_CATEGORIES),
});

// ── Transaction Notes ───────────────────────────────────
export const transactionNotesSchema = z.object({
  transactionId: z.string().min(1, "Transaction is required"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().default(""),
});

// ── Account Statements ──────────────────────────────────
export const statementFilterSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/** First validation message, for single-message error responses. */
export function firstIssue(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Invalid input";
}

/**
 * Message when `amountCents` must not be written, or null when it is a whole
 * number of cents from 1 through {@link MAX_TRANSACTION_CENTS}.
 */
export function bookableCentsError(amountCents: number): string | null {
  const parsed = amountCentsSchema.safeParse(amountCents);
  return parsed.success ? null : firstIssue(parsed.error);
}

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
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type CategoryBudgetInput = z.infer<typeof categoryBudgetSchema>;
export type TransactionNotesInput = z.infer<typeof transactionNotesSchema>;
export type StatementFilterInput = z.infer<typeof statementFilterSchema>;

// Re-exported for convenience: the value set lives in src/lib/domain.ts.
export { TRANSACTION_CATEGORIES };
