import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountList } from "./AccountList";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import type { Account } from "@prisma/client";

const baseAccount: Account = {
  id: "acc-1",
  userId: "user-1",
  type: "checking",
  number: "CHK-1001",
  nickname: null,
  balance: 5240.75,
  creditLimit: null,
  interestRate: null,
  dueDate: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
};

function createAccount(overrides: Partial<Account> = {}): Account {
  return { ...baseAccount, ...overrides };
}

function renderList(accounts: Account[]) {
  return render(
    <LocaleProvider>
      <AccountList accounts={accounts} />
    </LocaleProvider>,
  );
}

describe("AccountList", () => {
  it("should show empty state when no accounts", () => {
    renderList([]);
    // Empty-state copy is not translated in the component.
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
  });

  it("should render a single account", () => {
    renderList([createAccount()]);
    expect(screen.getByText("CHK-1001")).toBeInTheDocument();
    expect(screen.getByText("$5,240.75")).toBeInTheDocument();
  });

  it("should render multiple accounts", () => {
    const accounts = [
      createAccount({ id: "acc-1", type: "checking", number: "CHK-1001", balance: 5240.75 }),
      createAccount({ id: "acc-2", type: "savings", number: "SAV-1001", balance: 12750.0 }),
    ];
    renderList(accounts);
    expect(screen.getByText("CHK-1001")).toBeInTheDocument();
    expect(screen.getByText("SAV-1001")).toBeInTheDocument();
    expect(screen.getByText("$5,240.75")).toBeInTheDocument();
    expect(screen.getByText("$12,750.00")).toBeInTheDocument();
  });

  it("should prefer the nickname when set", () => {
    renderList([createAccount({ nickname: "Rent fund" })]);
    expect(screen.getByText("Rent fund")).toBeInTheDocument();
  });

  it("should display zero balance correctly", () => {
    renderList([createAccount({ balance: 0 })]);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
