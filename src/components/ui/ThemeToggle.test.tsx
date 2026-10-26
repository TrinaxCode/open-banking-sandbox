import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, ThemeToggle, useTheme } from "./ThemeToggle";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";

function TestConsumer() {
  const { theme } = useTheme();
  return <div data-testid="current-theme">{theme}</div>;
}

function renderComponent(
  ui: React.ReactElement,
  initialTheme: "dark" | "light" = "dark",
) {
  return render(
    <LocaleProvider>
      <ThemeProvider initialTheme={initialTheme}>
        {ui}
        <TestConsumer />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

describe("ThemeToggle & ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("should render toggle button with single SVG icon", () => {
    renderComponent(<ThemeToggle />);
    const button = screen.getByTestId("theme-toggle");
    expect(button).toBeInTheDocument();

    const svgs = button.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });

  it("should toggle from dark to light mode on click", () => {
    renderComponent(<ThemeToggle />, "dark");
    expect(screen.getByTestId("current-theme").textContent).toBe("dark");

    const button = screen.getByTestId("theme-toggle");
    fireEvent.click(button);

    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should toggle from light to dark mode on click", () => {
    renderComponent(<ThemeToggle />, "light");
    expect(screen.getByTestId("current-theme").textContent).toBe("light");

    const button = screen.getByTestId("theme-toggle");
    fireEvent.click(button);

    expect(screen.getByTestId("current-theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("light")).toBe(false);
  });

  it("should persist theme preference to localStorage and cookies", () => {
    renderComponent(<ThemeToggle />, "dark");
    const button = screen.getByTestId("theme-toggle");
    fireEvent.click(button);

    expect(localStorage.getItem("trinax-theme")).toBe("light");
    expect(document.cookie).toContain("trinax-theme=light");
  });

  it("keeps the server theme when localStorage disagrees", () => {
    localStorage.setItem("trinax-theme", "dark");
    document.documentElement.className = "light";
    document.documentElement.style.colorScheme = "light";

    renderComponent(<ThemeToggle />, "light");

    expect(screen.getByTestId("current-theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(localStorage.getItem("trinax-theme")).toBe("light");
  });
});
