// ai-kit/rate-limit.ts
// Server-side in-memory rate limiter. Extracted from agente-cobranzas.
// Note: resets on cold start — acceptable for portfolio demos.

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

type RateLimitConfig = {
  maxRequests?: number;
  windowMs?: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

export function rateLimit(
  key: string,
  config: RateLimitConfig = {},
): RateLimitResult {
  const maxRequests = config.maxRequests ?? 10;
  const windowMs = config.windowMs ?? 60 * 60 * 1000; // 1 hour default

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, remaining: maxRequests - entry.count };
}
