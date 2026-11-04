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
 * Validates whether an IP address matches standard IPv4 or IPv6 format.
 * Prevents header injection or malformed strings from polluting Redis keys.
 */
function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // IPv4 regex (0.0.0.0 - 255.255.255.255)
  const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  // IPv6 regex
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(ip) || (ip.includes(':') && ipv6.test(ip));
}

/**
 * Extracts client IP securely with trusted reverse-proxy prioritization.
 *
 * Priority order:
 * 1. cf-connecting-ip / true-client-ip (Cloudflare edge - cannot be spoofed by client)
 * 2. x-vercel-forwarded-for (Vercel edge proxy - authoritative client IP)
 * 3. x-real-ip (Standard reverse proxy edge header)
 * 4. x-forwarded-for (Sanitized fallback with IP format validation)
 */
export function getClientIp(req: Request): string {
  // 1. Cloudflare edge
  const cfIp = req.headers.get('cf-connecting-ip') || req.headers.get('true-client-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 2. Vercel edge proxy
  const vercelForwarded = req.headers.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const candidate = vercelForwarded.split(',')[0]?.trim();
    if (candidate && isValidIp(candidate)) {
      return candidate;
    }
  }

  // 3. Trusted reverse-proxy X-Real-IP
  const realIp = req.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 4. Fallback: X-Forwarded-For (filter and extract valid IP)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (isValidIp(part)) {
        return part;
      }
    }
  }

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
