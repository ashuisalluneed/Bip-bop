import { TRPCError } from "@trpc/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store: key -> { count, resetAt }
const store = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory sliding-window rate limiter.
 * Throws TRPCError TOO_MANY_REQUESTS if the limit is exceeded.
 *
 * @param key         - Unique identifier (e.g. userId + procedure name)
 * @param maxRequests - Max number of requests allowed in the window
 * @param windowMs    - Window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): void {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Start a fresh window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.count >= maxRequests) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Please try again in ${retryAfterSec} second(s).`,
    });
  }

  entry.count += 1;
}
