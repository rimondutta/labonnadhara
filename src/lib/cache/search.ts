/**
 * lib/cache/search.ts
 *
 * Search cache functions.
 *
 * Search results are highly dynamic and caching them too aggressively
 * can lead to stale results or low hit rates.
 * TTL is short (2 minutes). Cache keys are normalized to lowercase.
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants ─────────────────────────────────────────────────────────────
export const SEARCH_TTL = 120;  // 2 min

/**
 * Get search results for a query.
 * @param query    Search string
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedSearchResults<T>(
  query: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Key is already normalized inside KEYS.search(query)
  return getOrSetCached<T>(KEYS.search(query), SEARCH_TTL, fetcher);
}
