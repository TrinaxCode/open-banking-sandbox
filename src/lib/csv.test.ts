import { describe, it, expect } from "vitest";
import { transactionsToCsv, type TransactionCsvRow } from "./csv";

function row(overrides: Partial<TransactionCsvRow> = {}): TransactionCsvRow {
  return {
    createdAt: new Date("2026-06-15T12:00:00Z"),
    type: "deposit",
    category: "income",
    description: "Salary",
    reference: null,
    amount: 100,
    status: "completed",
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
    const csv = transactionsToCsv([row()]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("deposit");
    expect(lines[1]).toContain("income");
    expect(lines[1]).toContain("100.00");
  });

  it("escapes commas and quotes in descriptions", () => {
    const csv = transactionsToCsv([row({ description: 'Coffee, "large"' })]);
    expect(csv).toContain('"Coffee, ""large"""');
  });

  it("formats amounts with two decimals", () => {
    const csv = transactionsToCsv([row({ amount: 1234.5 })]);
    expect(csv).toContain("1234.50");
  });

  it("accepts ISO date strings as well as Date objects", () => {
    const csv = transactionsToCsv([row({ createdAt: "2026-01-02T03:04:05.000Z" })]);
    expect(csv).toContain("2026-01-02T03:04:05.000Z");
  });
});
