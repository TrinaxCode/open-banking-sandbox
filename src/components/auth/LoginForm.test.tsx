import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { LocaleProvider } from "@/components/ui/LanguageSwitcher";

// Mock next-auth/react
const mockSignIn = vi.fn();
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

function renderForm() {
  return render(
    <LocaleProvider>
      <LoginForm />
    </LocaleProvider>,
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render email and password fields", () => {
    renderForm();

    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it("should show error message on failed login", async () => {
    mockSignIn.mockResolvedValue({ error: "Invalid credentials" });
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "wrongpass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("should navigate to dashboard on successful login", async () => {
    mockSignIn.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "correctpass");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should show generic error on exception", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "test-password");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/unexpected error/i),
      ).toBeInTheDocument();
    });
  });

  it("should disable button while loading", async () => {
    mockSignIn.mockImplementation(
      () => new Promise(() => {}),
    );
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByPlaceholderText("you@example.com"), "test@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "test-password");
    await user.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeDisabled();
  });
});
