import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { ThemeProvider } from "@/components/ui/ThemeToggle";
import type { TransactionForUi } from "@/types/ui";
import { DashboardClient } from "./DashboardClient";

const transaction: TransactionForUi = {
  id: "tx-1",
  userId: "user-1",
  accountId: "acc-1",
  targetAccountId: null,
  type: "deposit",
  amount: 40,
  description: "Coffee",
  reference: null,
  category: "food",
  status: "completed",
  createdAt: "2026-06-15T10:00:00.000Z",
};

function renderOverview(theme: "dark" | "light") {
  return render(
    <LocaleProvider initialLocale="en">
      <ThemeProvider initialTheme={theme}>
        <DashboardClient
          userName="Ada"
          totalBalance={100}
          previousBalance={80}
          accounts={[]}
          transactions={[transaction]}
        />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

describe("dashboard overview surfaces", () => {
  it("uses a dark fill for quick actions and recent transactions in dark mode", () => {
    renderOverview("dark");

    const actions = screen.getByTestId("quick-actions");
    for (const link of actions.querySelectorAll("a")) {
      expect(link.className).toContain("dark:bg-zinc-900");
      expect(link.className).not.toContain("dark:bg-transparent");
    }

    const list = screen.getByTestId("transaction-list");
    expect(list.className).toContain("dark:bg-zinc-900");
    expect(list.className).toContain("bg-white");
    expect(list.className).not.toContain("dark:bg-white/");
  });

  it("keeps those panels on a light surface in light mode", () => {
    renderOverview("light");

    const actions = screen.getByTestId("quick-actions");
    for (const link of actions.querySelectorAll("a")) {
      expect(link.className).toContain("bg-white");
    }
    expect(screen.getByTestId("transaction-list").className).toContain("bg-white");
  });
});
