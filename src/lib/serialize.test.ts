import { describe, it, expect } from "vitest";
import type { Account, Transaction, User } from "@prisma/client";
import {
  serializeAccount,
  serializeAccounts,
  serializeProfile,
  serializeTransaction,
} from "./serialize";

/**
 * The money boundary: cents in the database, decimal currency units in the UI.
 * If this conversion ever regresses, every page renders amounts 100x too big.
 */

const account: Account = {
  id: "acc-1",
  userId: "user-1",
  type: "savings",
  number: "SAV-1001",
  nickname: "Rainy day",
  balanceCents: 1_275_000,
  creditLimitCents: null,
  interestRate: 3.5,
  dueDate: null,
  lastInterestAt: new Date("2026-06-01T00:00:00Z"),
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
};

const transaction: Transaction = {
  id: "tx-1",
  userId: "user-1",
  accountId: "acc-1",
  targetAccountId: null,
  type: "deposit",
  amountCents: 524_075,
  description: "Salary",
  reference: null,
  category: "income",
  status: "completed",
  notes: null,
  createdAt: new Date("2026-06-15T12:00:00Z"),
};

describe("serializeAccount", () => {
  it("converts cents to decimal currency units", () => {
    const result = serializeAccount(account);
    expect(result.balance).toBe(12750);
    expect(result.creditLimit).toBeNull();
  });

  it("keeps a negative credit balance honest", () => {
    const result = serializeAccount({
      ...account,
      type: "credit",
      balanceCents: -125_050,
      creditLimitCents: 500_000,
    });
    expect(result.balance).toBe(-1250.5);
    expect(result.creditLimit).toBe(5000);
  });

  it("turns dates into ISO strings (RSC-safe)", () => {
    const result = serializeAccount(account);
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.lastInterestAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("maps a whole list", () => {
    const [first] = serializeAccounts([account]);
    expect(first?.balance).toBe(12750);
  });

  it("does not leak cent fields", () => {
    const result = serializeAccount(account) as unknown as Record<string, unknown>;
    expect(result.balanceCents).toBeUndefined();
    expect(result.creditLimitCents).toBeUndefined();
  });
});

describe("serializeTransaction", () => {
  it("converts the amount and the date", () => {
    const result = serializeTransaction(transaction);
    expect(result.amount).toBe(5240.75);
    expect(result.createdAt).toBe("2026-06-15T12:00:00.000Z");
  });
});

describe("serializeProfile", () => {
  it("sums account balances in cents before converting", () => {
    const user = {
      id: "user-1",
      email: "demo@banking.app",
      name: "Demo User",
      passwordHash: "x",
      accountNumber: "USR-D3M000",
      passwordChangedAt: null,
      notifyLowBalance: true,
      notifyLargeTx: true,
      lowBalanceThresholdCents: 10_000,
      largeTxThresholdCents: 100_000,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    } satisfies User;

    // 0.1 + 0.2 style drift cannot happen here: the sum is integer cents.
    const profile = serializeProfile(user, [
      { ...account, balanceCents: 10 },
      { ...account, id: "acc-2", balanceCents: 20 },
    ]);

    expect(profile.totalBalance).toBe(0.3);
    expect(profile.accountCount).toBe(2);
    expect(profile.lowBalanceThreshold).toBe(100);
    expect(profile.largeTxThreshold).toBe(1000);
    expect(profile).not.toHaveProperty("lowBalanceThresholdCents");
  });
});
