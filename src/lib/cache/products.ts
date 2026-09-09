/**
 * lib/cache/products.ts
 *
 * Domain-specific product cache functions.
 *
 * All functions follow the same contract:
 *   1. Try Redis (fast path)
 *   2. On miss: query MongoDB (via the provided db fn)
 *   3. Write result back to Redis
 *   4. Return value
 *
 * TTLs are defined here as constants — change in one place.
 *
 * NEVER cache:
 *  - Cart or wishlist state
 *  - User-specific prices or recommendations
 *  - Checkout or payment data
 *  - Admin-facing unfiltered product lists (those bypass this module)
 */
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';

// ── TTL Constants (seconds) ───────────────────────────────────────────────────
export const PRODUCT_TTL         = 300;   // 5 min — individual product
export const PRODUCT_LIST_TTL    = 300;   // 5 min — listing page
export const FEATURED_TTL        = 300;   // 5 min — featured products
export const RELATED_TTL         = 300;   // 5 min — related products

// ── Type helpers (lightweight, avoid circular imports) ────────────────────────
export type ProductCacheOptions = {
  page?: number;
  limit?: number;
  category?: string | null;
  search?: string | null;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
};

// ── Build a stable, normalized listing cache key ──────────────────────────────
export function buildProductListKey(opts: ProductCacheOptions): string {
  const page     = opts.page     ?? 1;
  const limit    = opts.limit    ?? 20;
  const category = opts.category?.toLowerCase().trim() ?? 'all';
  const search   = opts.search?.toLowerCase().trim()   ?? 'none';
  const sort     = opts.sort                           ?? 'newest';
  const minPrice = opts.minPrice ?? 0;
  const maxPrice = opts.maxPrice ?? 0;
  return `cache:products:page:${page}:limit:${limit}:cat:${category}:q:${search}:sort:${sort}:price:${minPrice}-${maxPrice}`;
}

// ── Individual product ────────────────────────────────────────────────────────

/**
 * Get a product by its slug from Redis, or fetch from MongoDB.
 * @param slug     Product URL slug
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedProductBySlug<T>(
  slug: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.productBySlug(slug), PRODUCT_TTL, fetcher);
}

/**
 * Get a product by its MongoDB ID from Redis, or fetch from MongoDB.
 * @param id       MongoDB ObjectId string
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedProductById<T>(
  id: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.productById(id), PRODUCT_TTL, fetcher);
}

// ── Product listings ──────────────────────────────────────────────────────────

/**
 * Get a paginated, filtered product listing.
 * The cache key is deterministically built from the query options.
 *
 * @param opts     Filter/sort/pagination options
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedProductListing<T>(
  opts: ProductCacheOptions,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = buildProductListKey(opts);
  return getOrSetCached<T>(key, PRODUCT_LIST_TTL, fetcher);
}

// ── Featured / Related ────────────────────────────────────────────────────────

/**
 * Get featured products (e.g. for homepage hero).
 * @param fetcher  Async function that queries MongoDB
 */
export async function getCachedFeaturedProducts<T>(
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.featuredProducts(), FEATURED_TTL, fetcher);
}

/**
 * Get related products for a product detail page.
 * @param productId  The source product ID (to build a distinct key)
 * @param fetcher    Async function that queries MongoDB
 */
export async function getCachedRelatedProducts<T>(
  productId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return getOrSetCached<T>(KEYS.relatedProducts(productId), RELATED_TTL, fetcher);
}
