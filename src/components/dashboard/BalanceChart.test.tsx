import { cloneElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { ThemeProvider, ThemeToggle } from "@/components/ui/ThemeToggle";
import type { TransactionForUi } from "@/types/ui";
import { BalanceChart, computeChartData } from "./BalanceChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 480, height: 200 }),
  };
});

const transactions: TransactionForUi[] = [
  {
    id: "tx-1",
    userId: "user-1",
    accountId: "acc-1",
    targetAccountId: null,
    type: "deposit",
    amount: 120,
    description: "Pay",
    reference: null,
    category: "income",
    status: "completed",
    createdAt: new Date().toISOString(),
  },
];

function renderChart(theme: "dark" | "light") {
  return render(
    <LocaleProvider initialLocale="en">
      <ThemeProvider initialTheme={theme}>
        <BalanceChart
          balance={5240.75}
          previousBalance={5000}
          transactions={transactions}
        />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

function surfaceFill(theme: "dark" | "light") {
  const chart = renderChart(theme).getByTestId("balance-chart");
  const plot = screen.getByTestId("balance-chart-plot");
  const tooltip = screen.getByTestId("balance-chart-tooltip");
  const ticks = chart.querySelectorAll(".recharts-cartesian-axis-tick-value");
  const grid = chart.querySelectorAll(".recharts-cartesian-grid line");
  return { chart, plot, tooltip, ticks, grid };
}

describe("computeChartData", () => {
  it("ends on the current balance and treats a credit-interest charge as a debit", () => {
    const chargedAt = Date.now() - 6 * 60 * 60 * 1000;
    const charge: TransactionForUi = {
      ...transactions[0]!,
      id: "interest-charge",
      type: "interest",
      category: "bills",
      amount: 10,
      description: "Interest charged",
      createdAt: new Date(chargedAt).toISOString(),
    };

    const points = computeChartData([charge], "day", "Now", () => "x", 1000);
    const now = points[points.length - 1];
    const before = points.find((point) => point.cutoffMs < chargedAt);

    expect(now?.name).toBe("Now");
    expect(now?.value).toBe(1000);
    expect(before?.value).toBe(1010);
  });
});

describe("BalanceChart theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("paints a dark plot, light axis text, and a light-on-dark tooltip", () => {
    const { chart, plot, tooltip, ticks, grid } = surfaceFill("dark");

    expect(chart.style.backgroundColor).toBe("rgb(24, 24, 27)");
    expect(screen.getByTestId("balance-chart-tooltip").textContent).toContain(
      "$5,240.75",
    );
    expect(chart.className).toContain("bg-zinc-900");
    expect(chart.className).not.toContain("bg-white");
    expect(plot.style.backgroundColor).toBe("rgb(24, 24, 27)");
    expect(tooltip.style.backgroundColor).toBe("rgb(10, 10, 10)");
    expect(tooltip.style.color).toBe("rgb(244, 244, 245)");
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.getAttribute("fill")).toBe("#e4e4e7");
    }
    expect(grid.length).toBeGreaterThan(0);
    for (const line of grid) {
      expect(line.getAttribute("stroke")).toBe("rgba(255,255,255,0.14)");
    }
  });

  it("keeps a light surface and dark tick and tooltip text", () => {
    const { chart, plot, tooltip, ticks, grid } = surfaceFill("light");

    expect(chart.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(chart.className).toContain("bg-white");
    expect(chart.className).not.toContain("bg-zinc-900");
    expect(plot.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(tooltip.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(tooltip.style.color).toBe("rgb(24, 24, 27)");
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.getAttribute("fill")).toBe("#3f3f46");
    }
    expect(grid.length).toBeGreaterThan(0);
    for (const line of grid) {
      expect(line.getAttribute("stroke")).toBe("rgba(0,0,0,0.08)");
    }
  });

  it("updates the chart fill when the theme control is switched", () => {
    render(
      <LocaleProvider initialLocale="en">
        <ThemeProvider initialTheme="dark">
          <ThemeToggle />
          <BalanceChart balance={100} previousBalance={90} transactions={transactions} />
        </ThemeProvider>
      </LocaleProvider>,
    );

    const chart = screen.getByTestId("balance-chart");
    expect(chart.style.backgroundColor).toBe("rgb(24, 24, 27)");
    fireEvent.click(screen.getByTestId("theme-toggle"));
    expect(chart.style.backgroundColor).toBe("rgb(255, 255, 255)");
    expect(screen.getByTestId("balance-chart-tooltip").style.color).toBe(
      "rgb(24, 24, 27)",
    );
  });
});
