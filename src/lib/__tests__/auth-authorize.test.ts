import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  createLog: vi.fn(),
  checkRateLimit: vi.fn(),
  resetRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    securityLog: { create: mocks.createLog },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  resetRateLimit: mocks.resetRateLimit,
}));

import { authOptions } from "@/lib/auth";

const PASSWORD = "correct-horse-battery";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

type Authorize = (
  credentials: Record<string, string> | undefined,
  req: unknown,
) => Promise<{ id: string; email: string; name: string | null } | null>;

function authorize(): Authorize {
  const provider = authOptions.providers[0] as unknown as {
    options: { authorize: Authorize };
  };
  return provider.options.authorize;
}

const request = { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } };
const user = { id: "user-1", email: "ana@example.com", name: "Ana", passwordHash };

describe("authorize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 4,
      retryAfterMs: 0,
    });
    mocks.createLog.mockResolvedValue({});
    mocks.findUnique.mockResolvedValue(user);
  });

  it("returns the user and clears both rate limit counters on success", async () => {
    const result = await authorize()({ email: user.email, password: PASSWORD }, request);

    expect(result).toEqual({ id: "user-1", email: user.email, name: "Ana" });
    expect(mocks.resetRateLimit).toHaveBeenCalledWith("login:ip:203.0.113.7");
    expect(mocks.resetRateLimit).toHaveBeenCalledWith(`login:${user.email}`);
  });

  it("never leaks the password hash in the returned user", async () => {
    const result = await authorize()({ email: user.email, password: PASSWORD }, request);
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("records the first forwarded IP in the security log", async () => {
    await authorize()({ email: user.email, password: PASSWORD }, request);

    expect(mocks.createLog).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        action: "login",
        ipAddress: "203.0.113.7",
      }),
    });
  });

  it("falls back to an unknown IP when the proxy header is missing", async () => {
    await authorize()({ email: user.email, password: PASSWORD }, { headers: {} });

    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      "login:ip:unknown",
      expect.any(Object),
    );
  });

  it("still logs the user in when writing the security log fails", async () => {
    mocks.createLog.mockRejectedValue(new Error("db down"));

    const result = await authorize()({ email: user.email, password: PASSWORD }, request);

    expect(result).toMatchObject({ id: "user-1" });
  });

  it("rejects a wrong password without resetting the rate limit", async () => {
    const result = await authorize()(
      { email: user.email, password: "wrong-password" },
      request,
    );

    expect(result).toBeNull();
    expect(mocks.resetRateLimit).not.toHaveBeenCalled();
    expect(mocks.createLog).not.toHaveBeenCalled();
  });

  it("still compares a password for unknown emails to keep timing uniform", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const compare = vi.spyOn(bcrypt, "compare");

    const result = await authorize()(
      { email: "ghost@example.com", password: PASSWORD },
      request,
    );

    expect(result).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    compare.mockRestore();
  });

  it("blocks before touching the database when the IP is rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      retryAfterMs: 1000,
    });

    const result = await authorize()({ email: user.email, password: PASSWORD }, request);

    expect(result).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("blocks before touching the database when the email is rate limited", async () => {
    mocks.checkRateLimit
      .mockResolvedValueOnce({ allowed: true, remaining: 10, retryAfterMs: 0 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, retryAfterMs: 1000 });

    const result = await authorize()({ email: user.email, password: PASSWORD }, request);

    expect(result).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
