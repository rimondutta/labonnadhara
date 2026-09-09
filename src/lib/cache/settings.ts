/**
 * lib/cache/settings.ts
 *
 * Store settings cache functions (shipping, pixel, etc).
 *
 * Settings change very rarely, so TTL is long (30 minutes).
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants ─────────────────────────────────────────────────────────────
export const SETTINGS_TTL = 1800;  // 30 min

/**
 * Get the global settings document.
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedSettings<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.settings(), SETTINGS_TTL, fetcher);
}

/**
 * Get just the shipping configuration.
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedShipping<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.shipping(), SETTINGS_TTL, fetcher);
}

/**
 * Get just the Facebook pixel configuration.
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedPixel<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.pixel(), SETTINGS_TTL, fetcher);
}
