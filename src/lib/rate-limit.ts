/**
 * Rate limiting with a pluggable store.
 *
 * The default store is in-process and therefore per-instance: fine for local
 * development and a single-node deployment, but a multi-instance deployment
 * needs shared state. Set `RATE_LIMIT_DRIVER=database` to use the
 * `RateLimitEntry` table instead, which works across instances without adding
 * Redis to the stack.
 */

import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Time window in milliseconds (default: 15 minutes) */
  windowMs: number;
  /** Error message to return when rate limit is exceeded */
  message: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 once blocked). */
  remaining: number;
  /** Milliseconds until the window resets. */
  retryAfterMs: number;
  message?: string;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
}

// ── In-memory store ─────────────────────────────────────

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memory = new Map<string, MemoryEntry>();

const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  Array.from(memory.entries()).forEach(([key, entry]) => {
    if (entry.resetAt <= now) memory.delete(key);
  });
}, CLEANUP_INTERVAL).unref();

export const memoryStore: RateLimitStore = {
  async increment(key, windowMs) {
    const now = Date.now();
    const entry = memory.get(key);
    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      memory.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }
    entry.count += 1;
    return { count: entry.count, resetAt: entry.resetAt };
  },
  async reset(key) {
    memory.delete(key);
  },
};

// ── Database store ──────────────────────────────────────

/** Build a store backed by a Prisma client (defaults to the app singleton). */
export function createDatabaseStore(client: PrismaClient = prisma): RateLimitStore {
  return {
    async increment(key, windowMs) {
      const now = new Date();
      const existing = await client.rateLimitEntry.findUnique({ where: { key } });

      if (!existing || existing.resetAt <= now) {
        const resetAt = new Date(now.getTime() + windowMs);
        const record = await client.rateLimitEntry.upsert({
          where: { key },
          create: { key, count: 1, resetAt },
          update: { count: 1, resetAt },
        });
        return { count: record.count, resetAt: record.resetAt.getTime() };
      }

      const updated = await client.rateLimitEntry.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return { count: updated.count, resetAt: existing.resetAt.getTime() };
    },
    async reset(key) {
      await client.rateLimitEntry.deleteMany({ where: { key } });
    },
  };
}

export const databaseStore = createDatabaseStore();

function activeStore(): RateLimitStore {
  return process.env.RATE_LIMIT_DRIVER === "database" ? databaseStore : memoryStore;
}

const defaultConfig: RateLimitConfig = {
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many login attempts. Please try again later.",
};

/**
 * Count a request against `key` and report whether it is allowed.
 * A missing or expired window starts a fresh one. Pass `store` to override the
 * configured backend (used by tests).
 */
export async function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
  store: RateLimitStore = activeStore(),
): Promise<RateLimitResult> {
  const cfg = { ...defaultConfig, ...config };
  const { count, resetAt } = await store.increment(key, cfg.windowMs);
  const retryAfterMs = Math.max(resetAt - Date.now(), 0);

  if (count > cfg.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
      message: cfg.message,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(cfg.max - count, 0),
    retryAfterMs,
  };
}

/** Clear the counter for a key (e.g. after a successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  await activeStore().reset(key);
}
