import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";
import { ThemeProvider } from "@/components/ui/ThemeToggle";
import { LoginForm } from "@/components/auth/LoginForm";
import { NotificationBell, type NotificationItem } from "./NotificationBell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("@/lib/actions", () => ({
  markNotificationsRead: vi.fn(async () => ({ success: true })),
  clearNotifications: vi.fn(async () => ({ success: true })),
}));

const notification: NotificationItem = {
  id: "note-1",
  type: "info",
  title: "Payroll landed",
  body: "Your paycheck is available.",
  read: false,
  createdAt: "2026-06-15T10:00:00.000Z",
};

function classTokens(className: string) {
  return className.split(/\s+/).filter(Boolean);
}

function isDarkVariant(token: string) {
  return token.split(":").includes("dark");
}

function unprefixed(className: string) {
  return classTokens(className).filter((token) => !isDarkVariant(token));
}

function renderBell(theme: "light" | "dark") {
  document.documentElement.className = theme;
  document.documentElement.style.colorScheme = theme;
  return render(
    <LocaleProvider initialLocale="en">
      <ThemeProvider initialTheme={theme}>
        <NotificationBell notifications={[notification]} />
      </ThemeProvider>
    </LocaleProvider>,
  );
}

describe("notification list surfaces", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("opens an opaque light panel with dark text in light mode", () => {
    renderBell("light");

    const trigger = screen.getByRole("button", { name: "Notifications" });
    const triggerText = unprefixed(trigger.className).filter((token) =>
      token.includes("text-"),
    );
    expect(
      triggerText.some((token) =>
        /text-(zinc-[6-9]00|zinc-950|slate-[6-9]00|slate-950)/.test(token),
      ),
    ).toBe(true);
    expect(triggerText.some((token) => /text-white/.test(token))).toBe(false);

    fireEvent.click(trigger);

    expect(screen.getByText("Payroll landed")).toBeInTheDocument();
    expect(screen.getByText("Your paycheck is available.")).toBeInTheDocument();

    const panel = screen.getByTestId("notification-list");
    const panelText = unprefixed(panel.className);
    expect(panelText).toContain("bg-white");
    expect(panelText.some((token) => token.startsWith("bg-white/"))).toBe(false);
    expect(panelText.some((token) => /text-zinc-(800|900|950)/.test(token))).toBe(true);
    expect(panel.parentElement).toBe(document.body);
    expect(panel.className).toContain("fixed");
    expect(unprefixed(panel.className)).toContain("z-40");
    expect(document.documentElement.classList.contains("light")).toBe(true);
  });

  it("keeps a dark surface and light text in dark mode", () => {
    renderBell("dark");

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    const panel = screen.getByTestId("notification-list");
    const darkTokens = classTokens(panel.className).filter(isDarkVariant);
    expect(
      darkTokens.some((token) => /dark:bg-(?:\[#0|#111|zinc-900|zinc-950)/.test(token)),
    ).toBe(true);
    expect(
      darkTokens.some((token) => /dark:text-(?:zinc-100|zinc-50|white)/.test(token)),
    ).toBe(true);
    expect(screen.getByText("Payroll landed")).toBeInTheDocument();
    expect(screen.getByText("Your paycheck is available.")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("login demo-fill contrast", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "light";
  });

  it("uses a dark amber or zinc tone in light mode", () => {
    render(
      <LocaleProvider initialLocale="en">
        <ThemeProvider initialTheme="light">
          <LoginForm />
        </ThemeProvider>
      </LocaleProvider>,
    );

    const demo = screen.getByRole("button", { name: /fill demo credentials/i });
    const textTokens = unprefixed(demo.className).filter((token) =>
      token.includes("text-"),
    );
    expect(
      textTokens.some((token) =>
        /text-(?:primary-[6-9]00|primary-950|zinc-[6-9]00|zinc-950|amber-[6-9]00|amber-950)/.test(
          token,
        ),
      ),
    ).toBe(true);
    expect(textTokens.some((token) => /text-primary-200/.test(token))).toBe(false);
    expect(textTokens.some((token) => /text-primary-300/.test(token))).toBe(false);
  });
});
