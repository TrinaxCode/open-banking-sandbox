/**
 * Simple in-memory rate limiter for login attempts.
 * Resets after the configured window (default: 15 minutes).
 *
 * Note: In-memory stores don't scale across multiple instances.
 * For production with multiple servers, use Redis or a database-backed store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  });
}, CLEANUP_INTERVAL).unref();

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  max: number;
  /** Time window in milliseconds (default: 15 minutes) */
  windowMs: number;
  /** Error message to return when rate limit is exceeded */
  message: string;
}

const defaultConfig: RateLimitConfig = {
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many login attempts. Please try again later.",
};

/**
 * Check if a given key has exceeded the rate limit.
 * Returns `{ allowed: true }` or `{ allowed: false, message: string }`.
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {},
): { allowed: boolean; message?: string } {
  const cfg = { ...defaultConfig, ...config };
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // First request or window expired — start a new window
    store.set(key, { count: 1, resetAt: now + cfg.windowMs });
    return { allowed: true };
  }

  if (entry.count >= cfg.max) {
    return { allowed: false, message: cfg.message };
  }

  entry.count += 1;
  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
