import { describe, it, expect } from "vitest";
import { transactionsToCsv } from "./csv";
import type { Transaction } from "@prisma/client";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    userId: "u1",
    accountId: "a1",
    targetAccountId: null,
    type: "deposit",
    amount: 100,
    description: "Salary",
    reference: null,
    category: "income",
    status: "completed",
    createdAt: new Date("2026-06-15T12:00:00Z"),
    ...overrides,
  };
}

describe("transactionsToCsv", () => {
  it("includes a header row", () => {
    const csv = transactionsToCsv([]);
    expect(csv.split("\n")[0]).toBe(
      "Date,Type,Category,Description,Reference,Amount,Status",
    );
  });

  it("serializes a transaction row", () => {
    const csv = transactionsToCsv([tx()]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("deposit");
    expect(lines[1]).toContain("income");
    expect(lines[1]).toContain("100.00");
  });

  it("escapes commas and quotes in descriptions", () => {
    const csv = transactionsToCsv([tx({ description: 'Coffee, "large"' })]);
    expect(csv).toContain('"Coffee, ""large"""');
  });

  it("formats amount with two decimals", () => {
    const csv = transactionsToCsv([tx({ amount: 1234.5 })]);
    expect(csv).toContain("1234.50");
  });
});
