// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  getAccountStatement: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/services/statements", () => ({
  getAccountStatement: mocks.getAccountStatement,
}));

import { GET } from "@/app/api/statement/route";

function call(query: string) {
  return GET(new Request(`http://localhost:3000/api/statement?${query}`));
}

describe("GET /api/statement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("requires a session", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    expect((await call("accountId=a&year=2026&month=3")).status).toBe(401);
    expect(mocks.getAccountStatement).not.toHaveBeenCalled();
  });

  it.each([
    "year=2026&month=3",
    "accountId=a&month=3",
    "accountId=a&year=2026",
    "accountId=a&year=2026&month=13",
    "accountId=a&year=2026&month=0",
    "accountId=a&year=1999&month=3",
    "accountId=a&year=2101&month=3",
    "accountId=a&year=2026abc&month=3",
    "accountId=a&year=2026&month=-1",
  ])("rejects invalid parameters (%s) with 400", async (query) => {
    expect((await call(query)).status).toBe(400);
    expect(mocks.getAccountStatement).not.toHaveBeenCalled();
  });

  it("returns the statement privately and uncached", async () => {
    mocks.getAccountStatement.mockResolvedValue({
      ok: true,
      data: { statementId: "s1" },
    });

    const response = await call("accountId=a&year=2026&month=3");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ statement: { statementId: "s1" } });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getAccountStatement).toHaveBeenCalledWith("user-1", "a", 2026, 3);
  });

  it("maps a missing account to 404", async () => {
    mocks.getAccountStatement.mockResolvedValue({
      ok: false,
      code: "not_found",
      message: "Account not found",
    });
    expect((await call("accountId=a&year=2026&month=3")).status).toBe(404);
  });

  it("reports unexpected service failures as 500, not 404", async () => {
    mocks.getAccountStatement.mockResolvedValue({
      ok: false,
      code: "internal_error",
      message: "db exploded",
    });
    expect((await call("accountId=a&year=2026&month=3")).status).toBe(500);
  });

  it("answers 500 with a generic body when the service throws", async () => {
    mocks.getAccountStatement.mockRejectedValue(new Error("secret internals"));

    const response = await call("accountId=a&year=2026&month=3");

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("secret");
  });
});
