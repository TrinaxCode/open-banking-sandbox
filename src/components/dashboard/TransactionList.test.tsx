import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionList } from "./TransactionList";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import type { TransactionForUi } from "@/types/ui";

const baseTransaction: TransactionForUi = {
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
  createdAt: "2026-06-15T10:00:00.000Z",
};

function createTransaction(overrides: Partial<TransactionForUi> = {}): TransactionForUi {
  return { ...baseTransaction, ...overrides };
}

function renderList(transactions: TransactionForUi[]) {
  return render(
    <LocaleProvider initialLocale="en">
      <TransactionList transactions={transactions} />
    </LocaleProvider>,
  );
}

describe("TransactionList", () => {
  it("should show empty state when no transactions", () => {
    renderList([]);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("should render transaction rows", () => {
    const transactions = [
      createTransaction({
        id: "tx-1",
        amount: 500,
        type: "deposit",
        description: "Salary",
      }),
      createTransaction({
        id: "tx-2",
        amount: 100,
        type: "withdrawal",
        description: "ATM",
      }),
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

  it("renders a credit-interest charge as a debit and savings interest as a credit", async () => {
    const user = userEvent.setup();
    renderList([
      createTransaction({
        id: "tx-charge",
        type: "interest",
        category: "bills",
        amount: 10,
        description: "Credit interest",
      }),
      createTransaction({
        id: "tx-earn",
        type: "interest",
        category: "income",
        amount: 10,
        description: "Savings interest",
      }),
    ]);

    const charge = screen.getByText("-$10.00");
    expect(charge.className).toContain("text-red-400");
    const earned = screen.getByText("+$10.00");
    expect(earned.className).toContain("text-emerald-400");

    await user.click(screen.getByText("Credit interest"));
    expect(within(screen.getByRole("dialog")).getByText("-$10.00")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(screen.getByText("Savings interest"));
    expect(within(screen.getByRole("dialog")).getByText("+$10.00")).toBeInTheDocument();
  });

  it("should display interest as income and fees as spending", () => {
    const { unmount } = renderList([
      createTransaction({ id: "tx-i", amount: 12.22, type: "interest" }),
    ]);
    expect(screen.getByText("+$12.22")).toBeInTheDocument();
    unmount();

    renderList([createTransaction({ id: "tx-f", amount: 1, type: "fee" })]);
    expect(screen.getByText("-$1.00")).toBeInTheDocument();
  });

  it("should show translated type when description is null", () => {
    const tx = createTransaction({ description: null, type: "deposit" });
    renderList([tx]);
    const found = screen.getAllByText("Deposit");
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  it("should render translated column headers", () => {
    const tx = createTransaction({ id: "tx-1", amount: 100, type: "deposit" });
    renderList([tx]);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("should format date correctly", () => {
    // Use a midday UTC time so the local-timezone date stays June 15.
    const tx = createTransaction({ createdAt: "2026-06-15T12:00:00.000Z" });
    renderList([tx]);
    // Date now includes a time component (e.g. "Jun 15, 12:00 PM"), so match
    // the date portion with a flexible matcher.
    expect(screen.getByText(/Jun 15/)).toBeInTheDocument();
  });
});
