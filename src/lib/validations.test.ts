import { describe, it, expect } from "vitest";
import { loginSchema, passwordSchema, registerSchema } from "./validations";

describe("loginSchema", () => {
  it("should accept valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "test-password",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "test-password",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });

  it("should reject empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "test-password",
    });
    expect(result.success).toBe(false);
  });

  it("should reject password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("password");
    }
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing email field", () => {
    const result = loginSchema.safeParse({
      password: "test-password",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing password field", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "test-password",
      confirmPassword: "test-password",
    });
    expect(result.success).toBe(true);
  });

  it("should reject when passwords do not match", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "test-password",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("confirmPassword");
    }
  });

  it("should reject invalid email in registration", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "invalid",
      password: "test-password",
      confirmPassword: "test-password",
    });
    expect(result.success).toBe(false);
  });

  it("should reject short password in registration", () => {
    const result = registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password: "12345",
      confirmPassword: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "john@example.com",
      password: "test-password",
      confirmPassword: "test-password",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      name: "A".repeat(101),
      email: "john@example.com",
      password: "test-password",
      confirmPassword: "test-password",
    });
    expect(result.success).toBe(false);
  });
});

describe("password policy for new passwords", () => {
  const register = (password: string) =>
    registerSchema.safeParse({
      name: "John Doe",
      email: "john@example.com",
      password,
      confirmPassword: password,
    });

  it("requires 8 characters when registering", () => {
    expect(register("1234567").success).toBe(false);
    expect(register("12345678").success).toBe(true);
  });

  it("rejects passwords bcrypt would silently truncate", () => {
    expect(register("a".repeat(72)).success).toBe(true);
    expect(register("a".repeat(73)).success).toBe(false);
  });

  it("applies the same floor when changing a password", () => {
    const change = (newPassword: string) =>
      passwordSchema.safeParse({
        currentPassword: "old-password",
        newPassword,
        confirmPassword: newPassword,
      });

    expect(change("1234567").success).toBe(false);
    expect(change("12345678").success).toBe(true);
  });

  it("still lets existing 6-character passwords log in", () => {
    expect(
      loginSchema.safeParse({ email: "old@example.com", password: "123456" }).success,
    ).toBe(true);
  });
});
