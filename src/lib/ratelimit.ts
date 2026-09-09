import { Ratelimit } from '@upstash/ratelimit';
import { redis, hasRedis } from '@/lib/redis';

// Strict limiter for sensitive actions like checkout/orders (5 req / min)
const strictRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
}) : null;

// Global limiter for general API routes (60 req / min)
const globalRatelimit = (hasRedis && redis) ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
}) : null;

/**
 * Validates whether the given identifier (e.g. IP address) is rate-limited.
 * Gracefully falls back to allowing the request if Upstash Redis is not configured.
 * 
 * @param identifier The unique string to rate limit by (e.g., IP address).
 * @param type The type of rate limit to apply ('strict' or 'global'). Default is 'strict' for backwards compatibility.
 * @returns boolean True if the request should be blocked, False otherwise.
 */
export async function isRateLimited(identifier: string, type: 'strict' | 'global' = 'strict'): Promise<boolean> {
  const limiter = type === 'strict' ? strictRatelimit : globalRatelimit;
  
  if (!limiter) {
    // Graceful fallback when Upstash is not configured.
    console.warn(`[ratelimit] Upstash Redis credentials not found, bypassing ${type} rate limit.`);
    return false;
  }

  try {
    const { success } = await limiter.limit(identifier);
    // If success is false, the user has exceeded the limit
    return !success;
  } catch (error) {
    console.error(`[ratelimit] Error applying ${type} rate limit:`, error);
    // In case of a Redis failure, fail open to prevent blocking legitimate requests
    return false;
  }
}
