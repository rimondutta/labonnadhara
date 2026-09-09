/**
 * lib/cache/navigation.ts
 *
 * Navigation / menu data cache.
 *
 * Navigation data (category list for nav menus) changes very rarely.
 * Use a long TTL of 30 minutes to maximize CDN hit rate.
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants ─────────────────────────────────────────────────────────────
export const NAVIGATION_TTL = 1800;  // 30 min

/**
 * Get navigation data (e.g. list of active category names/slugs for menus).
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedNavigation<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.navigation(), NAVIGATION_TTL, fetcher);
}
