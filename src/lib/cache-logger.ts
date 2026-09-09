/**
 * Cache debug logger.
 *
 * Set CACHE_DEBUG=true in your environment to enable verbose logging.
 * In production this is silent by default — no overhead, no log noise.
 *
 * Usage:
 *   import { cacheLog } from '@/lib/cache-logger';
 *   cacheLog('HIT',  'product:slug:my-toy');
 *   cacheLog('MISS', 'product:slug:my-toy');
 *   cacheLog('SET',  'product:slug:my-toy', { ttl: 300 });
 *   cacheLog('DEL',  'products:*');
 *   cacheLog('ERROR','product:slug:my-toy', undefined, err);
 */

const DEBUG = process.env.CACHE_DEBUG === 'true';

export type CacheEvent = 'HIT' | 'MISS' | 'SET' | 'DEL' | 'ERROR' | 'BYPASS' | 'SKIP';

const COLORS: Record<CacheEvent, string> = {
  HIT:    '✅',
  MISS:   '🔍',
  SET:    '💾',
  DEL:    '🗑️',
  ERROR:  '❌',
  BYPASS: '⏭️',
  SKIP:   '⏸️',
};

/**
 * Log a cache event.
 * Only outputs if CACHE_DEBUG=true — completely silent otherwise.
 */
export function cacheLog(
  event: CacheEvent,
  key: string,
  meta?: Record<string, unknown>,
  error?: unknown
): void {
  if (!DEBUG) return;

  const icon = COLORS[event] ?? '•';
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

  if (event === 'ERROR' && error) {
    console.error(`[cache][${timestamp}] ${icon} ${event} ${key}${metaStr}`, error);
  } else {
    console.log(`[cache][${timestamp}] ${icon} ${event} ${key}${metaStr}`);
  }
}

/**
 * Log how long a cache operation took (only in debug mode).
 */
export function cacheTimer(label: string): () => void {
  if (!DEBUG) return () => {};
  const start = Date.now();
  return () => {
    console.log(`[cache] ⏱  ${label} took ${Date.now() - start}ms`);
  };
}
