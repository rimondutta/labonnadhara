import { Ratelimit } from '@upstash/ratelimit';
import { redis, hasRedis } from '@/lib/redis';

// Dedicated Auth limiter for authentication endpoints (5 req / 1 min per IP)
export const authRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
}) : null;

// Strict limiter for sensitive actions like checkout/orders (5 req / 1 min)
export const strictRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:strict',
}) : null;

// Dedicated AI Chat limiter to prevent token exhaustion / credit burning (10 req / 1 min per IP)
export const chatRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:chat',
}) : null;

// Global limiter for general API routes (60 req / 1 min)
export const globalRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: 'ratelimit:global',
}) : null;

export interface RateLimitResult {
  isLimited: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Extracts client IP securely without blindly trusting spoofable headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const clientIp = forwarded.split(',')[0]?.trim();
    if (clientIp) return clientIp;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  return '127.0.0.1';
}

/**
 * Checks detailed rate limit with remaining/reset metadata for proper 429 response headers.
 */
export async function checkRateLimit(
  identifier: string,
  type: 'auth' | 'strict' | 'global' | 'chat' = 'strict'
): Promise<RateLimitResult> {
  const limiter =
    type === 'auth'
      ? authRatelimit
      : type === 'strict'
      ? strictRatelimit
      : type === 'chat'
      ? chatRatelimit
      : globalRatelimit;

  if (!limiter) {
    return { isLimited: false, limit: 100, remaining: 100, reset: 0 };
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);
    return {
      isLimited: !success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error(`[ratelimit] Error applying ${type} rate limit:`, error);
    return { isLimited: false, limit: 100, remaining: 100, reset: 0 };
  }
}

/**
 * Validates whether the given identifier (e.g. IP address) is rate-limited.
 */
export async function isRateLimited(
  identifier: string,
  type: 'auth' | 'strict' | 'global' | 'chat' = 'strict'
): Promise<boolean> {
  const result = await checkRateLimit(identifier, type);
  return result.isLimited;
}
