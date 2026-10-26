import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountList } from "./AccountList";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import type { AccountForUi } from "@/types/ui";

const baseAccount: AccountForUi = {
  id: "acc-1",
  userId: "user-1",
  type: "checking",
  number: "CHK-1001",
  nickname: null,
  balance: 5240.75,
  creditLimit: null,
  interestRate: null,
  dueDate: null,
  lastInterestAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function createAccount(overrides: Partial<AccountForUi> = {}): AccountForUi {
  return { ...baseAccount, ...overrides };
}

function renderList(accounts: AccountForUi[]) {
  return render(
    <LocaleProvider initialLocale="en">
      <AccountList accounts={accounts} />
    </LocaleProvider>,
  );
}

describe("AccountList", () => {
  it("should show empty state when no accounts", () => {
    renderList([]);
    // Empty-state copy is not translated in the component.
    expect(screen.getByText("No accounts yet")).toBeInTheDocument();
    expect(
      screen.getByText("Open your first account to get started."),
    ).toBeInTheDocument();
  });

  it("should render a single account", () => {
    renderList([createAccount()]);
    expect(screen.getByText("CHK-1001")).toBeInTheDocument();
    expect(screen.getByText("$5,240.75")).toBeInTheDocument();
  });

  it("should render multiple accounts", () => {
    const accounts = [
      createAccount({
        id: "acc-1",
        type: "checking",
        number: "CHK-1001",
        balance: 5240.75,
      }),
      createAccount({
        id: "acc-2",
        type: "savings",
        number: "SAV-1001",
        balance: 12750.0,
      }),
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

  it("gives every card one height, padding, a truncated name, and a dark fill", () => {
    const longName = "Rainy day emergency fund for the whole household";
    renderList([
      createAccount({ id: "short", nickname: "Everyday", number: "CHK-1001" }),
      createAccount({
        id: "long",
        type: "savings",
        nickname: longName,
        number: "SAV-1001",
        balance: 800,
      }),
      createAccount({
        id: "credit",
        type: "credit",
        nickname: "Travel",
        number: "CRD-1001",
        balance: -1250.5,
        creditLimit: 5000,
      }),
    ]);

    const cards = screen.getAllByTestId("account-card");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.className).toContain("h-40");
      expect(card.className).toContain("p-4");
      expect(card.className).toContain("dark:bg-zinc-900");
      expect(card.className).not.toContain("dark:bg-transparent");
      expect(card.className).toContain("bg-white");
    }

    const longNameNode = screen.getByText(longName);
    expect(longNameNode.className).toContain("truncate");
    expect(screen.getByText(/of \$5,000\.00 limit/)).toBeInTheDocument();
  });

  it("should show the credit limit for credit accounts", () => {
    renderList([
      createAccount({
        type: "credit",
        number: "CRD-1001",
        balance: -1250.5,
        creditLimit: 5000,
      }),
    ]);
    expect(screen.getByText("-$1,250.50")).toBeInTheDocument();
    expect(screen.getByText(/of \$5,000\.00 limit/)).toBeInTheDocument();
  });
});
