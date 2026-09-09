/**
 * lib/cache/homepage.ts
 *
 * Homepage data cache.
 *
 * The homepage aggregates products + categories + blogs in one query.
 * Cache it together to avoid multiple round-trips on every ISR rebuild.
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants ─────────────────────────────────────────────────────────────
export const HOMEPAGE_TTL = 300;  // 5 min

/**
 * Get the homepage composite data (trending products, categories, latest blogs).
 * @param fetcher  Async function that queries MongoDB for all homepage data
 */
export async function getCachedHomepageData<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.homepage(), HOMEPAGE_TTL, fetcher);
}
