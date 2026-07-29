// @vitest-environment node
import { describe, it, expect } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// Date.now() collides when tests run within the same millisecond, which made
// them share entries in the module-level rate-limit store (notably keeping a
// 60s-window entry alive under the time-sensitive "reset" test). Use a
// monotonic counter so every test gets a guaranteed-unique key.
let keySeq = 0;
const uniqueKey = () => `test:${Date.now()}:${keySeq++}`;

describe("checkRateLimit", () => {
  it("should allow first request", () => {
    const result = checkRateLimit(uniqueKey(), { max: 3, windowMs: 60000 });
    expect(result.allowed).toBe(true);
  });

  it("should allow requests within limit", () => {
    const key = uniqueKey();
    expect(checkRateLimit(key, { max: 3, windowMs: 60000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { max: 3, windowMs: 60000 }).allowed).toBe(true);
    expect(checkRateLimit(key, { max: 3, windowMs: 60000 }).allowed).toBe(true);
  });

  it("should block requests exceeding limit", () => {
    const key = uniqueKey();
    checkRateLimit(key, { max: 2, windowMs: 60000 });
    checkRateLimit(key, { max: 2, windowMs: 60000 });
    const result = checkRateLimit(key, { max: 2, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.message).toBeDefined();
  });

  it("should reset after window expires", async () => {
    const key = uniqueKey();
    const windowMs = 20;
    checkRateLimit(key, { max: 1, windowMs });
    expect(checkRateLimit(key, { max: 1, windowMs }).allowed).toBe(false);
    // Sleep well beyond the window (4x) so the test stays deterministic even
    // when the event loop is busy under parallel test load.
    await new Promise((resolve) => setTimeout(resolve, windowMs * 4));
    expect(checkRateLimit(key, { max: 1, windowMs }).allowed).toBe(true);
  });

  it("should use default config when no options provided", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key);
    }
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
  });

  it("should use custom message when provided", () => {
    const key = uniqueKey();
    checkRateLimit(key, { max: 0, windowMs: 60000, message: "Custom error" });
    const result = checkRateLimit(key, { max: 0, windowMs: 60000, message: "Custom error" });
    expect(result.allowed).toBe(false);
    expect(result.message).toBe("Custom error");
  });

  it("should handle different keys independently", () => {
    const key1 = `${uniqueKey()}:1`;
    const key2 = `${uniqueKey()}:2`;

    checkRateLimit(key1, { max: 1, windowMs: 60000 });
    expect(checkRateLimit(key1, { max: 1, windowMs: 60000 }).allowed).toBe(false);
    expect(checkRateLimit(key2, { max: 1, windowMs: 60000 }).allowed).toBe(true);
  });

  it("should allow a new window after an explicit reset", () => {
    const key = uniqueKey();
    checkRateLimit(key, { max: 1, windowMs: 60000 });
    expect(checkRateLimit(key, { max: 1, windowMs: 60000 }).allowed).toBe(false);
    resetRateLimit(key);
    expect(checkRateLimit(key, { max: 1, windowMs: 60000 }).allowed).toBe(true);
  });
});
