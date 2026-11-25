/**
 * Shared Upstash Redis client.
 *
 * Exported as a singleton so every API route, cache helper, and rate-limiter
 * reuses the same connection pool instead of creating a new HTTP client per
 * request. Import `redis` (the client) or `hasRedis` (the availability flag)
 * anywhere you need them.
 *
 * Falls back gracefully when credentials are absent (e.g. local dev without
 * a Redis instance) — callers should always check `hasRedis` before using.
 */
import { Redis } from '@upstash/redis';

function isValidRedisConfig(url?: string, token?: string): boolean {
  if (!url || !token) return false;
  const trimmedUrl = url.trim();
  const trimmedToken = token.trim();
  if (
    trimmedUrl.includes('<') ||
    trimmedUrl.includes('>') ||
    trimmedUrl.includes('your-redis-instance') ||
    trimmedToken.includes('your_upstash_redis_rest_token')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const hasRedis = isValidRedisConfig(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.UPSTASH_REDIS_REST_TOKEN
);

export const redis: Redis | null = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
      // Override the default fetch to avoid cache: 'no-store' which breaks Next.js ISR/Static Generation
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        if (init && init.cache === 'no-store') {
          delete init.cache;
        }
        return fetch(input, init);
      },
    } as any)
  : null;
