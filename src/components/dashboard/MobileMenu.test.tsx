import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

function renderMenu() {
  return render(
    <LocaleProvider>
      <MobileMenu userName="John Doe" />
    </LocaleProvider>,
  );
}

describe("MobileMenu", () => {
  it("keeps the account chrome and drops the maintainer profile link", () => {
    const { container } = renderMenu();

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
