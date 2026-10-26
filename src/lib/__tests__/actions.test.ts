// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type PeerUser,
  type TestUser,
} from "@/__tests__/db-helpers";

/**
 * The server-action adapter layer.
 *
 * These actions are the contract the UI depends on: they take FormData, validate
 * it, call a service and answer `{ success }` or `{ error }` — with money already
 * converted to decimal units. The session and `revalidatePath` are stubbed, so
 * what is under test is the adapter itself, not the framework around it.
 */
const mockState = vi.hoisted(() => ({
  client: undefined as unknown as PrismaClient,
  userId: "",
}));

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return mockState.client;
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: async () =>
    mockState.userId
      ? { user: { id: mockState.userId, email: "test@example.com" } }
      : null,
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Map([
      ["x-forwarded-for", "127.0.0.1"],
      ["x-real-ip", "127.0.0.1"],
    ]),
}));

let prisma: PrismaClient;
let user: TestUser;
let peer: PeerUser;

async function actions() {
  return import("@/lib/actions");
}

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

beforeAll(async () => {
  prisma = await createTestDb();
  mockState.client = prisma;
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDbs();
});

beforeEach(async () => {
  user = await seedTestUser(prisma);
  peer = await seedPeerUser(prisma);
  mockState.userId = user.user.id;
  delete process.env.EXTERNAL_TRANSFER_FEE_CENTS;
});

describe("account actions", () => {
  it("creates an account and answers with decimal money", async () => {
    const { createAccount } = await actions();

    const result = await createAccount(form({ type: "savings" }));

    expect(result).toMatchObject({ success: true });
    expect(result.success && result.account).toMatchObject({
      type: "savings",
      balance: 0,
      interestRate: 3.5,
    });
    // The UI contract is decimals: no cent fields leak out.
    expect(result.success && result.account).not.toHaveProperty("balanceCents");
  });

  it("rejects an unknown account type", async () => {
    const { createAccount } = await actions();

    expect(await createAccount(form({ type: "crypto" }))).toMatchObject({
      error: expect.any(String),
    });
  });

  it("refuses to delete an account that still holds money", async () => {
    const { deleteAccount } = await actions();

    const result = await deleteAccount(null, form({ accountId: user.checkingAccountId }));

    expect(result.error).toMatch(/non-zero balance/);
  });

  it("updates a nickname", async () => {
    const { updateAccountNickname } = await actions();

    const result = await updateAccountNickname(
      form({ accountId: user.checkingAccountId, nickname: "  Everyday  " }),
    );

    expect(result).toMatchObject({ success: true });
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: user.checkingAccountId },
    });
    expect(account.nickname).toBe("Everyday");
  });
});

describe("money actions", () => {
  it("deposits and returns the updated account in decimals", async () => {
    const { deposit } = await actions();

    const result = await deposit(
      form({ accountId: user.checkingAccountId, amount: "123.45", description: "Pay" }),
    );

    expect(result.success && result.account.balance).toBe(5123.45);
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: user.checkingAccountId },
    });
    expect(account.balanceCents).toBe(512_345);
  });

  it("rejects sub-cent amounts before they reach the database", async () => {
    const { deposit } = await actions();

    const result = await deposit(
      form({ accountId: user.checkingAccountId, amount: "10.005" }),
    );

    expect(result).toMatchObject({ error: expect.stringMatching(/2 decimal places/) });
    const account = await prisma.account.findUniqueOrThrow({
      where: { id: user.checkingAccountId },
    });
    expect(account.balanceCents).toBe(500_000);
  });

  it("reports insufficient funds with the service message", async () => {
    const { withdraw } = await actions();

    const result = await withdraw(
      form({ accountId: user.checkingAccountId, amount: "6000" }),
    );

    expect(result).toMatchObject({ error: "Insufficient funds" });
  });

  it("transfers between own accounts", async () => {
    const { transfer } = await actions();

    const result = await transfer(
      form({
        fromAccountId: user.checkingAccountId,
        toAccountId: user.savingsAccountId,
        amount: "250.50",
        description: "Savings",
      }),
    );

    expect(result).toMatchObject({ success: true });
    const savings = await prisma.account.findUniqueOrThrow({
      where: { id: user.savingsAccountId },
    });
    expect(savings.balanceCents).toBe(1_025_050);
  });

  it("quotes the fee on an external transfer", async () => {
    const { transferExternal } = await actions();

    const result = await transferExternal(
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: peer.account.number,
        amount: "25",
      }),
    );

    expect(result).toMatchObject({
      success: true,
      feeCents: 100,
      totalDebitedCents: 2600,
    });
  });

  it("surfaces the generic destination error", async () => {
    const { transferExternal } = await actions();

    const result = await transferExternal(
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: "CHK-VOID00",
        amount: "25",
      }),
    );

    expect(result).toMatchObject({ error: "Invalid destination account" });
  });

  it("enforces step-up password confirmation on high-value external transfers", async () => {
    const { transferExternal } = await actions();

    const missingPw = await transferExternal(
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: peer.account.number,
        amount: "1200",
      }),
    );
    expect(missingPw).toMatchObject({
      error: "Password confirmation is required for high-value transfers",
    });

    const wrongPw = await transferExternal(
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: peer.account.number,
        amount: "1200",
        confirmPassword: "wrong-password",
      }),
    );
    expect(wrongPw).toMatchObject({
      error: "Incorrect password for high-value transfer verification",
    });

    const validPw = await transferExternal(
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: peer.account.number,
        amount: "1200",
        confirmPassword: "test-password",
      }),
    );
    expect(validPw).toMatchObject({
      success: true,
      feeCents: 100,
      totalDebitedCents: 120_100,
    });
  });

  it("exports the filtered history as CSV", async () => {
    const { exportTransactions } = await actions();

    const result = await exportTransactions(form({ type: "deposit" }));

    expect(result.count).toBe(2);
    expect(result.csv?.split("\n")[0]).toBe(
      "Date,Type,Category,Description,Reference,Amount,Status",
    );
    expect(result.csv).toContain("Salary");
  });

  it("re-categorizes a transaction", async () => {
    const { updateTransactionCategory } = await actions();
    const transaction = await prisma.transaction.findFirstOrThrow({
      where: { userId: user.user.id, type: "withdrawal" },
    });

    const result = await updateTransactionCategory(
      form({ transactionId: transaction.id, category: "food" }),
    );

    expect(result).toMatchObject({ success: true });
    const updated = await prisma.transaction.findUniqueOrThrow({
      where: { id: transaction.id },
    });
    expect(updated.category).toBe("food");
  });
});

describe("goal and schedule actions", () => {
  it("creates a goal with the target converted to cents", async () => {
    const { createSavingsGoal } = await actions();

    const result = await createSavingsGoal(
      null,
      form({
        name: "MacBook",
        targetAmount: "2499.99",
        accountId: user.savingsAccountId,
        color: "blue",
      }),
    );

    expect(result).toMatchObject({ success: true });
    const goal = await prisma.savingsGoal.findFirstOrThrow({
      where: { userId: user.user.id },
    });
    expect(goal.targetAmountCents).toBe(249_999);
  });

  it("contributes, reaches the goal and refunds on delete", async () => {
    const { contributeToGoal, deleteSavingsGoal } = await actions();
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.user.id,
        accountId: user.savingsAccountId,
        name: "Short goal",
        targetAmountCents: 10_000,
      },
    });

    const contributed = await contributeToGoal(
      null,
      form({ goalId: goal.id, amount: "100" }),
    );
    expect(contributed).toMatchObject({ success: true });

    const achieved = await prisma.savingsGoal.findUniqueOrThrow({
      where: { id: goal.id },
    });
    expect(achieved.currentAmountCents).toBe(10_000);
    expect(achieved.achievedAt).not.toBeNull();

    const deleted = await deleteSavingsGoal(null, form({ goalId: goal.id }));
    expect(deleted).toEqual({});

    const savings = await prisma.account.findUniqueOrThrow({
      where: { id: user.savingsAccountId },
    });
    expect(savings.balanceCents).toBe(1_000_000);
  });

  it("creates, toggles and deletes a scheduled transfer", async () => {
    const { createRecurringTransfer, toggleRecurringTransfer, deleteRecurringTransfer } =
      await actions();

    const created = await createRecurringTransfer(
      null,
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: user.savingsAccountNumber,
        amount: "500",
        frequency: "monthly",
        description: "Monthly savings",
      }),
    );
    expect(created).toMatchObject({ success: true });

    const schedule = await prisma.recurringTransfer.findFirstOrThrow({
      where: { userId: user.user.id },
    });
    expect(schedule.amountCents).toBe(50_000);

    expect(await toggleRecurringTransfer(null, form({ id: schedule.id }))).toEqual({});
    const paused = await prisma.recurringTransfer.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    expect(paused.active).toBe(false);

    expect(await deleteRecurringTransfer(null, form({ id: schedule.id }))).toEqual({});
    expect(
      await prisma.recurringTransfer.findUnique({ where: { id: schedule.id } }),
    ).toBeNull();
  });

  it("rejects an invalid destination account number", async () => {
    const { createRecurringTransfer } = await actions();

    const result = await createRecurringTransfer(
      null,
      form({
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: "nope",
        amount: "500",
        frequency: "monthly",
      }),
    );

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});

describe("profile and notification actions", () => {
  it("stores notification thresholds in cents", async () => {
    const { updateNotificationPrefs } = await actions();

    const result = await updateNotificationPrefs(
      form({
        notifyLowBalance: "true",
        notifyLargeTx: "false",
        lowBalanceThreshold: "250.50",
        largeTxThreshold: "1000",
      }),
    );

    expect(result).toMatchObject({ success: true });
    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } });
    expect(stored.lowBalanceThresholdCents).toBe(25_050);
    expect(stored.largeTxThresholdCents).toBe(100_000);
    expect(stored.notifyLargeTx).toBe(false);
  });

  it("marks notifications read and clears them", async () => {
    const { markNotificationsRead, clearNotifications } = await actions();
    await prisma.notification.create({
      data: { userId: user.user.id, type: "info", title: "Hi", body: "There" },
    });

    expect(await markNotificationsRead()).toMatchObject({ success: true });
    expect(await prisma.notification.count({ where: { read: false } })).toBe(0);

    expect(await clearNotifications()).toMatchObject({ success: true });
    expect(await prisma.notification.count({ where: { userId: user.user.id } })).toBe(0);
  });
});

describe("profile actions", () => {
  it("updates user display name", async () => {
    const { updateProfile } = await actions();
    const result = await updateProfile(form({ name: "Updated Name" }));
    expect(result).toMatchObject({ success: true });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.user.id } });
    expect(updated.name).toBe("Updated Name");
  });

  it("changes password when current password is valid", async () => {
    const { changePassword } = await actions();
    const result = await changePassword(
      form({
        currentPassword: "test-password",
        newPassword: "new-secret-pass",
        confirmPassword: "new-secret-pass",
      }),
    );
    expect(result).toMatchObject({ success: true });
  });

  it("rejects password change if current password is incorrect", async () => {
    const { changePassword } = await actions();
    const result = await changePassword(
      form({
        currentPassword: "wrong-password",
        newPassword: "new-secret-pass",
        confirmPassword: "new-secret-pass",
      }),
    );
    expect(result).toMatchObject({ error: "Current password is incorrect" });
  });

  it("refuses to delete user if credit account has negative balance", async () => {
    const { deleteUserAccount } = await actions();
    await prisma.account.create({
      data: {
        userId: user.user.id,
        type: "credit",
        number: "CRD-DEBT01",
        balanceCents: -50_000,
      },
    });

    const result = await deleteUserAccount();
    expect(result).toMatchObject({ error: "deleteAccount.creditWarning" });
  });

  it("deletes user account when eligible", async () => {
    const { deleteUserAccount } = await actions();
    const result = await deleteUserAccount();
    expect(result).toMatchObject({ success: true });
    expect(await prisma.user.findUnique({ where: { id: user.user.id } })).toBeNull();
  });

  it("exports personal data archive as masked JSON", async () => {
    const { exportPersonalData } = await actions();
    const result = await exportPersonalData();
    expect(result.json).toBeDefined();
    expect(result.filename).toMatch(/^trinaxbank-data-/);
    const parsed = JSON.parse(result.json!);
    expect(parsed.profile.email).toBe(user.user.email);
    expect(parsed.profile).not.toHaveProperty("passwordHash");
    expect(Array.isArray(parsed.accounts)).toBe(true);
    expect(Array.isArray(parsed.transactions)).toBe(true);
  });
});

describe("virtual card actions", () => {
  it("creates a virtual card, simulates a purchase, and toggles frozen state", async () => {
    const {
      createVirtualCard,
      simulateVirtualCardPurchase,
      toggleFreezeCard,
      deleteVirtualCard,
    } = await actions();

    const created = await createVirtualCard(
      null,
      form({ cardHolder: "Test Holder", isTemporary: "false" }),
    );
    expect(created.card).toBeDefined();
    const cardId = (created.card as { id: string }).id;

    const purchase = await simulateVirtualCardPurchase(
      form({
        cardId,
        accountId: user.checkingAccountId,
        amount: "19.99",
        merchant: "Spotify",
      }),
    );
    expect(purchase).toMatchObject({ success: true, usageCount: 1 });

    const frozen = await toggleFreezeCard(null, form({ cardId }));
    expect(frozen).toEqual({});
    const card = await prisma.virtualCard.findUniqueOrThrow({ where: { id: cardId } });
    expect(card.isFrozen).toBe(true);

    const deleted = await deleteVirtualCard(null, form({ cardId }));
    expect(deleted).toEqual({});
    expect(await prisma.virtualCard.findUnique({ where: { id: cardId } })).toBeNull();
  });

  it("enforces maximum 10 virtual cards per user", async () => {
    const { createVirtualCard } = await actions();
    for (let i = 0; i < 10; i++) {
      await prisma.virtualCard.create({
        data: {
          userId: user.user.id,
          cardNumber: `400000000000000${i}`,
          cardHolder: "Holder",
          expiryDate: "12/28",
          cvv: "123",
        },
      });
    }

    const result = await createVirtualCard(null, form({ cardHolder: "Excess Card" }));
    expect(result).toMatchObject({ error: "Maximum limit of 10 virtual cards reached" });
  });
});

describe("beneficiary actions", () => {
  it("adds and deletes a beneficiary", async () => {
    const { addBeneficiary, deleteBeneficiary } = await actions();

    const added = await addBeneficiary(
      null,
      form({
        name: "Bob Friend",
        accountNumber: "CHK-BOB001",
        nickname: "Bob",
      }),
    );
    expect(added).toMatchObject({ success: true });

    const saved = await prisma.beneficiary.findFirstOrThrow({
      where: { userId: user.user.id, accountNumber: "CHK-BOB001" },
    });
    expect(saved.name).toBe("Bob Friend");

    // Re-adding the same beneficiary returns error
    const duplicate = await addBeneficiary(
      null,
      form({
        name: "Bob Friend",
        accountNumber: "CHK-BOB001",
      }),
    );
    expect(duplicate).toMatchObject({ error: "Beneficiary already saved" });

    // Cannot add own account as beneficiary
    const ownAcc = await addBeneficiary(
      null,
      form({
        name: "Myself",
        accountNumber: user.checkingAccountNumber,
      }),
    );
    expect(ownAcc).toMatchObject({ error: "This is one of your own accounts" });

    const deleted = await deleteBeneficiary(null, form({ id: saved.id }));
    expect(deleted).toEqual({});
  });
});

describe("budget and note actions", () => {
  it("sets and deletes a category budget", async () => {
    const { setBudget, deleteBudget } = await actions();

    const setRes = await setBudget(
      form({
        category: "food",
        amount: "300.00",
      }),
    );
    expect(setRes).toMatchObject({ success: true });

    const budget = await prisma.categoryBudget.findFirstOrThrow({
      where: { userId: user.user.id, category: "food" },
    });
    expect(budget.amountCents).toBe(30_000);

    const delRes = await deleteBudget(form({ category: "food" }));
    expect(delRes).toMatchObject({ success: true });
    expect(
      await prisma.categoryBudget.findFirst({
        where: { userId: user.user.id, category: "food" },
      }),
    ).toBeNull();
  });

  it("updates transaction notes", async () => {
    const { updateTransactionNotes } = await actions();
    const tx = user.transactions[0]!;

    const result = await updateTransactionNotes(
      form({
        transactionId: tx.id,
        notes: "Monthly business expense",
      }),
    );
    expect(result).toMatchObject({ success: true });

    const updated = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(updated.notes).toBe("Monthly business expense");
  });
});

describe("registration action", () => {
  it("registers a new user successfully", async () => {
    const { register } = await actions();

    const result = await register(
      null,
      form({
        name: "New Registrant",
        email: "registrant@example.com",
        password: "secure-password-123",
        confirmPassword: "secure-password-123",
      }),
    );
    expect(result).toMatchObject({ success: true });

    const created = await prisma.user.findUnique({
      where: { email: "registrant@example.com" },
    });
    expect(created).not.toBeNull();
    expect(created?.accountNumber).toMatch(/^USR-/);
  });

  it("rejects registration when email already exists", async () => {
    const { register } = await actions();

    const result = await register(
      null,
      form({
        name: "Existing Person",
        email: user.user.email,
        password: "secure-password-123",
        confirmPassword: "secure-password-123",
      }),
    );
    expect(result).toMatchObject({ error: "An account with this email already exists" });
  });
});
