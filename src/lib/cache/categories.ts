/**
 * lib/cache/categories.ts
 *
 * Domain-specific category cache functions.
 *
 * TTLs are longer than product caches because categories change rarely.
 * Invalidation is handled by lib/cache/invalidation.ts.
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants ─────────────────────────────────────────────────────────────
export const CATEGORY_LIST_TTL   = 900;  // 15 min — full category list
export const CATEGORY_TTL        = 900;  // 15 min — individual category
export const CATEGORY_PRODUCTS_TTL = 300; // 5 min — products within a category

// ── Category list ─────────────────────────────────────────────────────────────

/**
 * Get all active categories.
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedCategories<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.categoriesList(), CATEGORY_LIST_TTL, fetcher);
}

// ── Individual category ───────────────────────────────────────────────────────

/**
 * Get a category by its slug.
 * @param slug     Category URL slug
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedCategoryBySlug<T>(
  slug: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.categoryBySlug(slug), CATEGORY_TTL, fetcher);
}

/**
 * Get a category by its MongoDB ID.
 * @param id       MongoDB ObjectId string
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedCategoryById<T>(
  id: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.categoryById(id), CATEGORY_TTL, fetcher);
}

// ── Category product listings ─────────────────────────────────────────────────

/**
 * Get the paginated product list for a specific category.
 * @param categoryId  The category ID
 * @param page        Page number (default 1)
 * @param limit       Items per page
 * @param fetcher     Async function that queries MongoDB
 */
export async function getCachedCategoryProducts<T>(
  categoryId: string,
  page: number,
  limit: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = KEYS.categoryProducts(categoryId) + `:page:${page}:limit:${limit}`;
  return getOrSetCached<T>(key, CATEGORY_PRODUCTS_TTL, fetcher);
}
