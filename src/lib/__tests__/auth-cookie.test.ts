// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import NextAuth from "next-auth";
import { encode, getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import type { NextApiRequest, NextApiResponse } from "next";

afterEach(() => vi.unstubAllEnvs());

describe("session cookies and middleware", () => {
  it.each([
    ["production", "http://localhost:3000", false],
    ["production", "https://bank.example", true],
    ["development", "https://bank.example", true],
  ] as const)(
    "accepts the same session cookie in %s at %s",
    async (mode, url, secure) => {
      vi.stubEnv("NODE_ENV", mode);
      vi.stubEnv("NEXTAUTH_URL", url);
      vi.resetModules();
      const { authOptions } = await import("@/lib/auth");
      const secret = process.env.NEXTAUTH_SECRET!;
      const cookieName = `${secure ? "__Secure-" : ""}next-auth.session-token`;
      const token = await encode({
        secret,
        token: { id: "user-1", email: "test@example.com" },
      });
      const headers = new Map<string, string | string[]>();
      const response = {
        status: vi.fn().mockReturnThis(),
        getHeader: (name: string) => headers.get(name),
        setHeader: (name: string, value: string | string[]) => headers.set(name, value),
        send: vi.fn(),
      };

      await NextAuth(
        {
          method: "GET",
          query: { nextauth: ["session"] },
          cookies: { [cookieName]: token },
          headers: {},
        } as unknown as NextApiRequest,
        response as unknown as NextApiResponse,
        authOptions,
      );

      expect(response.send).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ id: "user-1" }),
        }),
      );
      const cookies = headers.get("Set-Cookie") as string[];
      const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("SameSite=Lax");
      expect(sessionCookie).toContain("Path=/");
      expect(/; Secure(?:;|$)/.test(sessionCookie!)).toBe(secure);

      const decoded = await getToken({
        req: new NextRequest(url, {
          headers: { cookie: sessionCookie!.split(";")[0]! },
        }),
        secret,
      });
      expect(decoded?.id).toBe("user-1");
    },
  );
});
