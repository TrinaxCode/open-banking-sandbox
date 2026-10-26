// @vitest-environment node
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import type { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type TestUser,
} from "@/__tests__/db-helpers";

const mockState = vi.hoisted(() => ({
  client: undefined as unknown as PrismaClient,
}));

vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return mockState.client;
  },
}));

let prisma: PrismaClient;
let user: TestUser;

async function route() {
  return import("@/app/api/jobs/run/route");
}

function request(token?: string): Request {
  return new Request("http://localhost:3000/api/jobs/run", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

beforeAll(async () => {
  prisma = await createTestDb();
  mockState.client = prisma;
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDbs();
  delete process.env.JOBS_SECRET;
});

beforeEach(async () => {
  user = await seedTestUser(prisma);
  await seedPeerUser(prisma);
  process.env.JOBS_SECRET = "test-jobs-secret";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/jobs/run", () => {
  it("is disabled until JOBS_SECRET is configured", async () => {
    delete process.env.JOBS_SECRET;
    const { POST } = await route();

    const response = await POST(request("test-jobs-secret"));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error.code).toBe("not_configured");
  });

  it("rejects a missing or wrong secret", async () => {
    const { POST } = await route();

    expect((await POST(request())).status).toBe(401);
    expect((await POST(request("nope"))).status).toBe(401);
    expect((await POST(request("test-jobs-secre"))).status).toBe(401);
  });

  it("runs scheduled transfers and interest for every user", async () => {
    await prisma.recurringTransfer.create({
      data: {
        userId: user.user.id,
        fromAccountId: user.checkingAccountId,
        targetAccountNumber: user.savingsAccountNumber,
        amountCents: 25_000,
        frequency: "monthly",
        nextRunAt: new Date(Date.now() - 60_000),
      },
    });

    const { POST } = await route();
    const response = await POST(request("test-jobs-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data.recurringExecuted).toBe(1);
    // The seeded savings account earns interest on its first run.
    expect(body.data.interestAccounts).toBeGreaterThanOrEqual(1);

    const checking = await prisma.account.findUniqueOrThrow({
      where: { id: user.checkingAccountId },
    });
    expect(checking.balanceCents).toBe(475_000);
  });

  it("does nothing when there is no due work", async () => {
    const { POST } = await route();

    const first = await POST(request("test-jobs-secret"));
    const second = await POST(request("test-jobs-secret"));

    expect((await first.json()).data.recurringExecuted).toBe(0);
    // Interest was posted by the first run, so the second has nothing to do.
    expect((await second.json()).data.interestAccounts).toBe(0);
  });

  it("reports job failures without exposing database details", async () => {
    const { POST } = await route();
    vi.spyOn(prisma.recurringTransfer, "findMany").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED private-db:5432"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request("test-jobs-secret"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.error.code).toBe("job_failed");
    expect(body.data).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("private-db");
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
  });
});
