import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionList } from "./TransactionList";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import type { Transaction } from "@prisma/client";

const baseTransaction: Transaction = {
  id: "tx-1",
  userId: "user-1",
  accountId: "acc-1",
  targetAccountId: null,
  type: "deposit",
  amount: 500,
  description: "Salary deposit",
  reference: null,
  category: "income",
  status: "completed",
  createdAt: new Date("2026-06-15T10:00:00Z"),
};

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return { ...baseTransaction, ...overrides };
}

function renderList(transactions: Transaction[]) {
  return render(
    <LocaleProvider>
      <TransactionList transactions={transactions} />
    </LocaleProvider>,
  );
}

describe("TransactionList", () => {
  it("should show empty state when no transactions", () => {
    renderList([]);
    expect(screen.getByText("Aún no hay transacciones")).toBeInTheDocument();
  });

  it("should render transaction rows", () => {
    const transactions = [
      createTransaction({ id: "tx-1", amount: 500, type: "deposit", description: "Salary" }),
      createTransaction({ id: "tx-2", amount: 100, type: "withdrawal", description: "ATM" }),
    ];
    renderList(transactions);
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("ATM")).toBeInTheDocument();
  });

  it("should display deposit amounts in green with + sign", () => {
    const tx = createTransaction({ amount: 250, type: "deposit" });
    renderList([tx]);
    const amountCell = screen.getByText("+$250.00");
    expect(amountCell).toBeInTheDocument();
    expect(amountCell.className).toContain("text-emerald-400");
  });

  it("should display withdrawal amounts in red with - sign", () => {
    const tx = createTransaction({ amount: 75, type: "withdrawal" });
    renderList([tx]);
    const amountCell = screen.getByText("-$75.00");
    expect(amountCell).toBeInTheDocument();
    expect(amountCell.className).toContain("text-red-400");
  });

  it("should display transfer_in as positive", () => {
    const tx = createTransaction({ amount: 200, type: "transfer_in" });
    renderList([tx]);
    expect(screen.getByText("+$200.00")).toBeInTheDocument();
  });

  it("should display transfer_out as negative", () => {
    const tx = createTransaction({ amount: 150, type: "transfer_out" });
    renderList([tx]);
    expect(screen.getByText("-$150.00")).toBeInTheDocument();
  });

  it("should show translated type when description is null", () => {
    const tx = createTransaction({ description: null, type: "deposit" });
    renderList([tx]);
    // Default locale is es, so "Depósito" should appear
    const found = screen.getAllByText("Depósito");
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  it("should render translated column headers", () => {
    const tx = createTransaction({ id: "tx-1", amount: 100, type: "deposit" });
    renderList([tx]);
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Descripción")).toBeInTheDocument();
    expect(screen.getByText("Monto")).toBeInTheDocument();
  });

  it("should format date correctly", () => {
    // Use a midday UTC time so the local-timezone date stays June 15.
    const tx = createTransaction({ createdAt: new Date("2026-06-15T12:00:00Z") });
    renderList([tx]);
    // Date now includes a time component (e.g. "Jun 15, 12:00 PM"), so match
    // the date portion with a flexible matcher.
    expect(screen.getByText(/Jun 15/)).toBeInTheDocument();
  });
});
