/**
 * lib/cache/redis-cache.ts
 *
 * Typed, reusable Redis CRUD helpers built on top of lib/redis.ts.
 *
 * API
 * ───
 *   getCached<T>(key)                      → T | null
 *   setCached<T>(key, value, ttl)          → void
 *   deleteCached(...keys)                  → void
 *   getOrSetCached<T>(key, ttl, fn)        → T        (primary helper — use this)
 *   deleteCachedPattern(pattern)           → void      (wildcard SCAN+DEL)
 *
 * Key convention
 * ──────────────
 * All keys passed to these helpers are already the FULL key (no auto-prefix here).
 * The callers in lib/cache/products.ts etc. are responsible for building keys.
 * lib/cache.ts (the legacy helper) still uses its own "cache:" prefix.
 *
 * Graceful degradation
 * ────────────────────
 * Every function is a no-op / fallback when Redis is unavailable.
 * The application keeps working; caching is purely additive.
 */
import { redis, hasRedis } from '@/lib/redis';
import { cacheLog } from '@/lib/cache-logger';

// ── Internal helpers ──────────────────────────────────────────────────────────

function safeStringify(value: unknown): string {
  return JSON.stringify(value);
}

function safeParse<T>(raw: string | null): T | null {
  if (raw === null || raw === undefined) return null;
  try {
    // Upstash auto-deserializes JSON for us in most cases; handle both
    if (typeof raw === 'object') return raw as T;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read a value from Redis.
 * Returns null on cache miss or if Redis is unavailable.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!hasRedis || !redis) {
    cacheLog('BYPASS', key, { reason: 'redis-unavailable' });
    return null;
  }
  try {
    const raw = await redis.get<T>(key);
    if (raw !== null && raw !== undefined) {
      cacheLog('HIT', key);
      return safeParse<T>(raw as any) ?? (raw as T);
    }
    cacheLog('MISS', key);
    return null;
  } catch (err: any) {
    // Never propagate DYNAMIC_SERVER_USAGE — re-throw it
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    cacheLog('ERROR', key, undefined, err);
    return null;
  }
}

/**
 * Write a value to Redis with a TTL.
 * Silently no-ops on failure — never crashes the app.
 */
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    await redis.setex(key, ttlSeconds, safeStringify(value));
    cacheLog('SET', key, { ttl: ttlSeconds });
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    cacheLog('ERROR', key, { op: 'SET' }, err);
  }
}

/**
 * Delete one or more exact Redis keys.
 */
export async function deleteCached(...keys: string[]): Promise<void> {
  if (!hasRedis || !redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
    for (const k of keys) cacheLog('DEL', k);
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    cacheLog('ERROR', keys.join(','), { op: 'DEL' }, err);
  }
}

/**
 * Delete all Redis keys matching a wildcard pattern (e.g. "products:*").
 * Uses SCAN + DEL in batches to avoid blocking Redis.
 */
export async function deleteCachedPattern(pattern: string): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    let cursor = 0;
    let deleted = 0;
    do {
      const [nextCursor, keys] = await redis.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== 0);
    cacheLog('DEL', pattern, { count: deleted });
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE') throw err;
    cacheLog('ERROR', pattern, { op: 'SCAN_DEL' }, err);
  }
}

/**
 * Primary helper: Get from cache, or compute + store the result.
 *
 * @param key        Full Redis key
 * @param ttl        Time-to-live in seconds
 * @param fn         Async factory — called only on cache miss
 * @returns          Cached or freshly computed value
 */
export async function getOrSetCached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;

  // Cache miss — compute the real value
  const value = await fn();

  // Write-through (don't await — let it succeed in the background)
  setCached(key, value, ttl).catch((err) => {
    cacheLog('ERROR', key, { op: 'write-through' }, err);
  });

  return value;
}
