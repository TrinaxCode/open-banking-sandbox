import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("should render a text input with label", () => {
    render(<Input id="email" name="email" label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "email");
  });

  it("should render without label when not provided", () => {
    render(<Input id="email" name="email" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("label")).not.toBeInTheDocument();
  });

  it("should display error message and red border", () => {
    render(<Input id="email" name="email" label="Email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.getByRole("textbox").className).toContain("border-premium-coral/50");
  });

  it("should set aria-invalid when error is present", () => {
    render(<Input id="email" name="email" error="Error" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("should link error to input via aria-describedby", () => {
    render(<Input id="email" name="email" error="Something wrong" />);
    const input = screen.getByRole("textbox");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBe("email-error");
    expect(screen.getByText("Something wrong")).toHaveAttribute("id", errorId);
  });

  it("should use name as fallback id when id is not provided", () => {
    render(<Input name="username" label="Username" />);
    expect(screen.getByLabelText("Username")).toHaveAttribute("id", "username");
  });

  it("should apply custom className", () => {
    render(<Input name="test" className="extra-class" />);
    expect(screen.getByRole("textbox").className).toContain("extra-class");
  });

  it("should render with placeholder", () => {
    render(<Input name="email" placeholder="you@example.com" />);
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("should render disabled input", () => {
    render(<Input name="email" disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });
});
