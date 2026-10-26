// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cleanupTestDbs, createTestDb } from "@/__tests__/db-helpers";
import {
  checkRateLimit,
  createDatabaseStore,
  resetRateLimit,
  type RateLimitStore,
} from "@/lib/rate-limit";

// Date.now() collides when tests run within the same millisecond, which made
// them share entries in the module-level rate-limit store (notably keeping a
// 60s-window entry alive under the time-sensitive "reset" test). Use a
// monotonic counter so every test gets a guaranteed-unique key.
let keySeq = 0;
const uniqueKey = () => `test:${Date.now()}:${keySeq++}`;

describe("checkRateLimit (in-memory store)", () => {
  it("should allow first request", async () => {
    const result = await checkRateLimit(uniqueKey(), { max: 3, windowMs: 60000 });
    expect(result.allowed).toBe(true);
  });

  it("should allow requests within limit", async () => {
    const key = uniqueKey();
    expect((await checkRateLimit(key, { max: 3, windowMs: 60000 })).allowed).toBe(true);
    expect((await checkRateLimit(key, { max: 3, windowMs: 60000 })).allowed).toBe(true);
    expect((await checkRateLimit(key, { max: 3, windowMs: 60000 })).allowed).toBe(true);
  });

  it("should block requests exceeding limit", async () => {
    const key = uniqueKey();
    await checkRateLimit(key, { max: 2, windowMs: 60000 });
    await checkRateLimit(key, { max: 2, windowMs: 60000 });
    const result = await checkRateLimit(key, { max: 2, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.message).toBeDefined();
    expect(result.remaining).toBe(0);
  });

  it("should report remaining requests", async () => {
    const key = uniqueKey();
    const first = await checkRateLimit(key, { max: 3, windowMs: 60000 });
    expect(first.remaining).toBe(2);
  });

  it("should reset after window expires", async () => {
    const key = uniqueKey();
    const windowMs = 20;
    await checkRateLimit(key, { max: 1, windowMs });
    expect((await checkRateLimit(key, { max: 1, windowMs })).allowed).toBe(false);
    // Sleep well beyond the window (4x) so the test stays deterministic even
    // when the event loop is busy under parallel test load.
    await new Promise((resolve) => setTimeout(resolve, windowMs * 4));
    expect((await checkRateLimit(key, { max: 1, windowMs })).allowed).toBe(true);
  });

  it("should use default config when no options provided", async () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(key);
    }
    const result = await checkRateLimit(key);
    expect(result.allowed).toBe(false);
  });

  it("should use custom message when provided", async () => {
    const key = uniqueKey();
    await checkRateLimit(key, { max: 0, windowMs: 60000, message: "Custom error" });
    const result = await checkRateLimit(key, {
      max: 0,
      windowMs: 60000,
      message: "Custom error",
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Custom error");
  });

  it("should handle different keys independently", async () => {
    const key1 = `${uniqueKey()}:1`;
    const key2 = `${uniqueKey()}:2`;

    await checkRateLimit(key1, { max: 1, windowMs: 60000 });
    expect((await checkRateLimit(key1, { max: 1, windowMs: 60000 })).allowed).toBe(false);
    expect((await checkRateLimit(key2, { max: 1, windowMs: 60000 })).allowed).toBe(true);
  });

  it("should allow a new window after an explicit reset", async () => {
    const key = uniqueKey();
    await checkRateLimit(key, { max: 1, windowMs: 60000 });
    expect((await checkRateLimit(key, { max: 1, windowMs: 60000 })).allowed).toBe(false);
    await resetRateLimit(key);
    expect((await checkRateLimit(key, { max: 1, windowMs: 60000 })).allowed).toBe(true);
  });
});

describe("database store", () => {
  let prisma: PrismaClient;
  let store: RateLimitStore;

  beforeAll(async () => {
    prisma = await createTestDb();
    store = createDatabaseStore(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  it("counts requests in the database and enforces the limit", async () => {
    const key = uniqueKey();
    expect((await checkRateLimit(key, { max: 2, windowMs: 60000 }, store)).allowed).toBe(
      true,
    );
    expect((await checkRateLimit(key, { max: 2, windowMs: 60000 }, store)).allowed).toBe(
      true,
    );
    expect((await checkRateLimit(key, { max: 2, windowMs: 60000 }, store)).allowed).toBe(
      false,
    );

    // The counter lives in the table, not in process memory.
    const row = await prisma.rateLimitEntry.findUnique({ where: { key } });
    expect(row?.count).toBe(3);
  });

  it("resets a key", async () => {
    const key = uniqueKey();
    await checkRateLimit(key, { max: 1, windowMs: 60000 }, store);
    expect((await checkRateLimit(key, { max: 1, windowMs: 60000 }, store)).allowed).toBe(
      false,
    );
    await store.reset(key);
    expect((await checkRateLimit(key, { max: 1, windowMs: 60000 }, store)).allowed).toBe(
      true,
    );
  });

  it("starts a fresh window once the previous one expired", async () => {
    const key = uniqueKey();
    await checkRateLimit(key, { max: 1, windowMs: 1 }, store);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect((await checkRateLimit(key, { max: 1, windowMs: 60000 }, store)).allowed).toBe(
      true,
    );
  });
});
