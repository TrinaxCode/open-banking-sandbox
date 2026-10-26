import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { formatCurrency } from "@/lib/i18n/format";
import type { BudgetsSummary } from "@/lib/services/budgets";
import { BudgetsClient } from "./BudgetsClient";

vi.mock("@/lib/actions", () => ({
  setBudget: vi.fn(),
  deleteBudget: vi.fn(),
}));

const spent = 9_876_543.21;
const limit = 1_234_567.89;

const summary: BudgetsSummary = {
  budgets: [
    {
      id: "budget-entertainment",
      category: "entertainment",
      budgetLimit: limit,
      budgetLimitCents: 123_456_789,
      spent,
      spentCents: 987_654_321,
      remaining: 0,
      remainingCents: 0,
      percentUsed: 800,
      isOverBudget: true,
    },
  ],
  totalBudget: limit,
  totalBudgetCents: 123_456_789,
  totalSpent: spent,
  totalSpentCents: 987_654_321,
  totalRemaining: 0,
  totalRemainingCents: 0,
  overallPercentUsed: 800,
  month: "2026-10",
};

describe("BudgetsClient", () => {
  it("keeps a long category, the over-budget badge, and large amounts in the cards", () => {
    render(
      <div style={{ width: 280 }}>
        <LocaleProvider initialLocale="es">
          <BudgetsClient initialSummary={summary} />
        </LocaleProvider>
      </div>,
    );

    const spentLabel = formatCurrency(spent, "es");
    const limitLabel = formatCurrency(limit, "es");

    expect(screen.getByText("Entretenimiento")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto Excedido")).toBeInTheDocument();
    // Intl inserts a non-breaking space before the currency code, so compare
    // the rendered text directly instead of a normalized text query.
    expect(document.body.textContent).toContain(spentLabel);
    expect(document.body.textContent).toContain(limitLabel);

    const card = screen.getByTestId("budget-card");
    expect(card.className).toContain("overflow-hidden");
    expect(card.className).toContain("min-w-0");
    expect(card.querySelector(".flex-wrap")).not.toBeNull();
    expect(card.querySelector(".break-all")).not.toBeNull();

    const totals = screen.getByTestId("budget-totals");
    expect(totals.className).toContain("overflow-hidden");
    expect(totals.className).toContain("min-w-0");
    expect(totals.textContent).toContain(spentLabel);
    expect(totals.textContent).toContain(limitLabel);
  });
});
