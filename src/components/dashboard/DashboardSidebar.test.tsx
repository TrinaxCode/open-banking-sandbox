import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSidebar } from "./DashboardSidebar";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

function renderWithLocale(ui: React.ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("DashboardSidebar", () => {
  it("should render the user name", () => {
    renderWithLocale(<DashboardSidebar userName="John Doe" />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should render translation-based labels", () => {
    renderWithLocale(<DashboardSidebar userName="Test User" />);
    expect(screen.getByText("Resumen")).toBeInTheDocument();
    expect(screen.getByText("Cuentas")).toBeInTheDocument();
    expect(screen.getByText("Tarjetas")).toBeInTheDocument();
    expect(screen.getByText("Presupuestos")).toBeInTheDocument();
    expect(screen.getByText("Extractos")).toBeInTheDocument();
  });

  it("should render sign out button", () => {
    renderWithLocale(<DashboardSidebar userName="Test User" />);
    expect(screen.getByText("Salir")).toBeInTheDocument();
  });

  it("should highlight active overview link", () => {
    renderWithLocale(<DashboardSidebar userName="Test User" />);
    const overviewLink = screen.getByText("Resumen").closest("a");
    expect(overviewLink?.className).toContain("bg-white/");
  });

  it("should render language switcher and theme toggle side by side in sidebar", () => {
    renderWithLocale(<DashboardSidebar userName="Test User" />);
    const langBtn = screen.getByText("ES");
    const themeBtn = screen.getByTestId("theme-toggle");
    expect(langBtn).toBeInTheDocument();
    expect(themeBtn).toBeInTheDocument();
  });

  it("keeps the account chrome and drops the maintainer profile link", () => {
    const { container } = renderWithLocale(<DashboardSidebar userName="John Doe" />);
    expect(screen.queryByText("@TrinaxCode")).not.toBeInTheDocument();
    for (const anchor of container.querySelectorAll("a")) {
      expect(anchor.getAttribute("href")).not.toBe("https://github.com/TrinaxCode");
    }
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Salir")).toBeInTheDocument();
    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("Presupuestos")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
