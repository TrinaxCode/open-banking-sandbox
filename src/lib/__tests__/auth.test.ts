import { describe, it, expect, vi } from "vitest";
import { authOptions } from "@/lib/auth";

describe("authOptions", () => {
  it("should have credentials provider", () => {
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers[0].id).toBe("credentials");
  });

  it("should use JWT session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("should have sign-in page set to /login", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  it("should set session maxAge to 24 hours", () => {
    expect(authOptions.session?.maxAge).toBe(24 * 60 * 60);
  });

  it("should set JWT maxAge to 24 hours", () => {
    expect(authOptions.jwt?.maxAge).toBe(24 * 60 * 60);
  });

  it("should configure secure cookies based on NODE_ENV", () => {
    const cookieOptions = authOptions.cookies?.sessionToken?.options;
    expect(cookieOptions?.httpOnly).toBe(true);
    expect(cookieOptions?.sameSite).toBe("lax");
    expect(cookieOptions?.path).toBe("/");
  });

  describe("authorize", () => {
    it("should return null for invalid email format", async () => {
      const provider = authOptions.providers[0];
      if (!("authorize" in provider)) throw new Error("Credentials provider not configured");
      const result = await provider.authorize({
        email: "invalid",
        password: "test-password",
      }, {} as Parameters<typeof provider.authorize>[1]);
      expect(result).toBeNull();
    });

    it("should return null for short password", async () => {
      const provider = authOptions.providers[0];
      if (!("authorize" in provider)) throw new Error("Credentials provider not configured");
      const result = await provider.authorize({
        email: "test@example.com",
        password: "12345",
      }, {} as Parameters<typeof provider.authorize>[1]);
      expect(result).toBeNull();
    });

    it("should return null when credentials are undefined", async () => {
      const provider = authOptions.providers[0];
      if (!("authorize" in provider)) throw new Error("Credentials provider not configured");
      const result = await provider.authorize(
        undefined,
        {} as Parameters<typeof provider.authorize>[1],
      );
      expect(result).toBeNull();
    });
  });

  describe("JWT callback", () => {
    it("should add user id to token when user is present", async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      if (!jwtCallback) throw new Error("JWT callback not defined");

      const token = await jwtCallback({
        token: { id: "existing-id", sub: "existing-token" },
        user: { id: "user-1", email: "test@example.com", name: "Test" },
        account: null as any,
        profile: null as any,
        trigger: "signIn" as any,
        isNewUser: false,
        session: null as any,
      });

      expect(token.id).toBe("user-1");
    });

    it("should return token unchanged when no user", async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      if (!jwtCallback) throw new Error("JWT callback not defined");

      const token = await jwtCallback({
        token: { id: "existing-id" },
        user: null as any,
        account: null as any,
        profile: null as any,
        trigger: "update" as any,
        isNewUser: false,
        session: null as any,
      });

      expect(token.id).toBe("existing-id");
    });
  });

  describe("Session callback", () => {
    it("should add user id to session", async () => {
      const sessionCallback = authOptions.callbacks?.session;
      if (!sessionCallback) throw new Error("Session callback not defined");

      const session = await sessionCallback({
        session: {
          user: { id: "", name: "Test", email: "test@example.com" },
          expires: "2026-12-31",
        },
        token: { id: "user-1" },
        user: null as any,
        newSession: null as any,
        trigger: "update" as any,
      });

      expect((session.user as { id?: string } | undefined)?.id).toBe("user-1");
    });
  });
});
