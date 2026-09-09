/**
 * lib/cache/invalidation.ts
 *
 * Centralized, granular cache invalidation helpers.
 *
 * Why granular?
 * ─────────────
 * Never flush the entire Redis cache for a single product change.
 * Each helper clears ONLY the keys that are actually stale, protecting
 * cached data for unrelated products, categories, and pages.
 *
 * Layer 1 — Redis  : clears the data cache (immediate)
 * Layer 2 — Next.js: revalidatePath / revalidateTag (ISR rebuild on next hit)
 *
 * Security
 * ────────
 * Never cache or invalidate user-specific data.
 * Never put session / payment / order data through these helpers.
 */
import { deleteCached, deleteCachedPattern } from '@/lib/cache/redis-cache';
import { cacheLog } from '@/lib/cache-logger';

// ── Key-building helpers (single source of truth for key names) ───────────────

export const KEYS = {
  // Products
  productById:      (id: string)   => `cache:product:id:${id}`,
  productBySlug:    (slug: string) => `cache:product:slug:${slug}`,
  productIsrSlug:   (slug: string) => `cache:product:isr:${slug}`,
  productsList:     ()             => 'cache:products:list',
  productsIsrList:  ()             => 'cache:products:isr:list',
  productsApiList:  ()             => 'cache:api:products:list',
  featuredProducts: ()             => 'cache:featured-products',
  relatedProducts:  (id: string)   => `cache:related-products:${id}`,

  // Categories
  categoryById:     (id: string)   => `cache:category:id:${id}`,
  categoryBySlug:   (slug: string) => `cache:category:slug:${slug}`,
  categoriesList:   ()             => 'cache:categories:list',
  categoryProducts: (id: string)   => `cache:category-products:${id}`,

  // Homepage
  homepage:         ()             => 'cache:home:isr:data',

  // Settings / Navigation
  settings:         ()             => 'cache:settings:global',
  shipping:         ()             => 'cache:settings:shipping',
  navigation:       ()             => 'cache:navigation:data',
  pixel:            ()             => 'cache:settings:pixel',

  // Search
  search:           (q: string)    => `cache:search:${q.toLowerCase().trim()}`,

  // API-level product lists (from /api/products and /api/v1/products)
  apiProductsPattern:   ()  => 'cache:api:products:*',
  v1ProductsPattern:    ()  => 'cache:products:v1:*',
  isrProductsPattern:   ()  => 'cache:product:isr:*',
  apiCategoriesPattern: ()  => 'cache:api:categories:*',
};

// ── Product invalidation ──────────────────────────────────────────────────────

/**
 * Invalidate all caches for a specific product (by ID and/or slug).
 * Also clears product listing caches since counts/order may change.
 * Also triggers Next.js ISR revalidation.
 */
export async function invalidateProduct(productId: string, slug?: string): Promise<void> {
  try {
    cacheLog('DEL', `[invalidateProduct] id=${productId} slug=${slug ?? 'unknown'}`);

    const keysToDelete: string[] = [
      KEYS.productById(productId),
      KEYS.productsList(),
      KEYS.productsIsrList(),
      KEYS.featuredProducts(),
      // homepage may reference this product (trending)
      KEYS.homepage(),
    ];

    if (slug) {
      keysToDelete.push(KEYS.productBySlug(slug));
      keysToDelete.push(KEYS.productIsrSlug(slug));
    }

    await deleteCached(...keysToDelete);

    // Wildcard-delete all paginated API product lists and v1 caches
    await Promise.all([
      deleteCachedPattern(KEYS.apiProductsPattern()),
      deleteCachedPattern(KEYS.v1ProductsPattern()),
      deleteCachedPattern(KEYS.isrProductsPattern()),
    ]);

    // Next.js ISR invalidation
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/products');
    if (slug) revalidatePath(`/products/${slug}`);

  } catch (err) {
    // Never crash the app on invalidation failure — log and continue
    cacheLog('ERROR', `[invalidateProduct] id=${productId}`, undefined, err);
    console.error('[cache] invalidateProduct failed:', err);
  }
}

/**
 * Invalidate only listing caches (after bulk operations or imports).
 */
export async function invalidateProductListings(): Promise<void> {
  try {
    await deleteCached(KEYS.productsList(), KEYS.productsIsrList(), KEYS.homepage());
    await Promise.all([
      deleteCachedPattern(KEYS.apiProductsPattern()),
      deleteCachedPattern(KEYS.v1ProductsPattern()),
    ]);
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/products');
  } catch (err) {
    cacheLog('ERROR', '[invalidateProductListings]', undefined, err);
    console.error('[cache] invalidateProductListings failed:', err);
  }
}

// ── Category invalidation ─────────────────────────────────────────────────────

/**
 * Invalidate all caches for a specific category (by ID and/or slug).
 * Also clears product-listing caches that filter by this category.
 */
export async function invalidateCategory(categoryId: string, slug?: string): Promise<void> {
  try {
    cacheLog('DEL', `[invalidateCategory] id=${categoryId} slug=${slug ?? 'unknown'}`);

    const keysToDelete: string[] = [
      KEYS.categoryById(categoryId),
      KEYS.categoriesList(),
      KEYS.categoryProducts(categoryId),
    ];

    if (slug) {
      keysToDelete.push(KEYS.categoryBySlug(slug));
    }

    await deleteCached(...keysToDelete);

    // Category changes affect product listings filtered by category
    await Promise.all([
      deleteCachedPattern(KEYS.apiProductsPattern()),
      deleteCachedPattern(KEYS.v1ProductsPattern()),
      deleteCachedPattern(KEYS.apiCategoriesPattern()),
    ]);

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/products');

  } catch (err) {
    cacheLog('ERROR', `[invalidateCategory] id=${categoryId}`, undefined, err);
    console.error('[cache] invalidateCategory failed:', err);
  }
}

/**
 * Invalidate only the category list (after adding/removing categories).
 */
export async function invalidateCategoryList(): Promise<void> {
  try {
    await deleteCached(KEYS.categoriesList());
    await deleteCachedPattern(KEYS.apiCategoriesPattern());
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/products');
  } catch (err) {
    cacheLog('ERROR', '[invalidateCategoryList]', undefined, err);
    console.error('[cache] invalidateCategoryList failed:', err);
  }
}

// ── Homepage invalidation ─────────────────────────────────────────────────────

export async function invalidateHomepage(): Promise<void> {
  try {
    await deleteCached(KEYS.homepage());
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
  } catch (err) {
    cacheLog('ERROR', '[invalidateHomepage]', undefined, err);
    console.error('[cache] invalidateHomepage failed:', err);
  }
}

// ── Settings invalidation ─────────────────────────────────────────────────────

export async function invalidateSettings(): Promise<void> {
  try {
    await deleteCached(KEYS.settings(), KEYS.shipping(), KEYS.pixel());
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/api/settings/shipping');
  } catch (err) {
    cacheLog('ERROR', '[invalidateSettings]', undefined, err);
    console.error('[cache] invalidateSettings failed:', err);
  }
}

// ── Navigation invalidation ───────────────────────────────────────────────────

export async function invalidateNavigation(): Promise<void> {
  try {
    await deleteCached(KEYS.navigation());
  } catch (err) {
    cacheLog('ERROR', '[invalidateNavigation]', undefined, err);
    console.error('[cache] invalidateNavigation failed:', err);
  }
}

// ── Nuclear option (use sparingly) ───────────────────────────────────────────

/**
 * Invalidate ALL public cache entries.
 * Use only in emergencies (e.g., data corruption discovered).
 * NEVER call this for routine product/category updates.
 */
export async function invalidateAll(): Promise<void> {
  try {
    cacheLog('DEL', '[invalidateAll] FULL CACHE FLUSH');
    await deleteCachedPattern('cache:*');
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/products');
  } catch (err) {
    cacheLog('ERROR', '[invalidateAll]', undefined, err);
    console.error('[cache] invalidateAll failed:', err);
  }
}
