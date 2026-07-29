import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BalanceCard } from "./BalanceCard";

describe("BalanceCard", () => {
  it("should render the total balance formatted as currency", () => {
    render(<BalanceCard balance={1234.56} accountCount={2} />);
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
  });

  it("should render zero balance correctly", () => {
    render(<BalanceCard balance={0} accountCount={1} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("should render large balance with commas", () => {
    render(<BalanceCard balance={1000000} accountCount={3} />);
    expect(screen.getByText("$1,000,000.00")).toBeInTheDocument();
  });

  it("should display the total label", () => {
    render(<BalanceCard balance={500} accountCount={1} />);
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
  });

  it("should display account count with plural 's' when multiple accounts", () => {
    render(<BalanceCard balance={500} accountCount={2} />);
    expect(screen.getByText("2 accounts")).toBeInTheDocument();
  });

  it("should display account count without plural when one account", () => {
    render(<BalanceCard balance={500} accountCount={1} />);
    expect(screen.getByText("1 account")).toBeInTheDocument();
  });

  it("should render negative balance", () => {
    render(<BalanceCard balance={-250.5} accountCount={1} />);
    expect(screen.getByText("-$250.50")).toBeInTheDocument();
  });
});
