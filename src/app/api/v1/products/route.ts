/**
 * GET /api/v1/products
 *
 * Versioned, headless storefront products endpoint.
 *
 * Features vs. the legacy /api/store/products:
 *  - Consistent JSON envelope: { data, meta, error }
 *  - Server-side pagination (?page=&limit=)
 *  - Redis response cache (60s TTL, auto-invalidated on admin writes)
 *  - ETag support for conditional requests (304 Not Modified)
 *  - Zod input validation
 *  - Cursor-based filter via ?category= and ?search=
 *
 * The legacy /api/store/products route remains unchanged for backward
 * compatibility with the mobile app.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { withCache } from '@/lib/cache';
import crypto from 'crypto';

// ── Query param validation ──────────────────────────────────────────────────
const QuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  search:   z.string().trim().optional(),
  ids:      z.string().trim().optional(),
});

// ── Shared cache headers ────────────────────────────────────────────────────
function cacheHeaders(etag: string) {
  return {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'ETag': etag,
    'Vary': 'Accept-Encoding',
  };
}

export async function GET(req: Request) {
  // ── 1. Validate query params ──────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { data: null, meta: null, error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { page, limit, category, search, ids } = parsed.data;
  const skip = (page - 1) * limit;

  // ── 2. Build a stable cache key from query params ─────────────────────────
  const cacheKey = `products:v1:${JSON.stringify({ page, limit, category, search, ids })}`;

  try {
    await connectToDatabase();

    const result = await withCache(cacheKey, 60, async () => {
      // Fast path: fetch by explicit IDs (wishlist, related products)
      if (ids) {
        const idList = ids.split(',').filter(Boolean);
        const [items, total] = await Promise.all([
          Product.find({ _id: { $in: idList }, isPublished: true })
            .populate('category', 'name slug')
            .select('title price compareAtPrice slug images category badge ageRange rating reviewCount inventory')
            .limit(limit)
            .lean(),
          Product.countDocuments({ _id: { $in: idList }, isPublished: true }),
        ]);
        return { items, total };
      }

      // Category filter path — single aggregation round-trip
      if (category && !search) {
        const pipeline: any[] = [
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmpty: true } },
          { $match: { isPublished: true, 'category.slug': category } },
          { $sort: { createdAt: -1 } },
          {
            $facet: {
              items: [
                { $skip: skip },
                { $limit: limit },
                {
                  $project: {
                    title: 1, price: 1, compareAtPrice: 1, slug: 1, images: 1, category: 1,
                    badge: 1, ageRange: 1, rating: 1, reviewCount: 1,
                    inventory: 1, createdAt: 1,
                  },
                },
              ],
              totalCount: [{ $count: 'count' }],
            },
          },
        ];
        const [agg] = await Product.aggregate(pipeline);
        return {
          items: agg.items,
          total: agg.totalCount[0]?.count ?? 0,
        };
      }

      // General / search path
      const query: any = { isPublished: true };
      if (search) {
        query.$text = { $search: search };
      }

      const [items, total] = await Promise.all([
        Product.find(query)
          .populate('category', 'name slug')
          .select('title price compareAtPrice slug images category badge ageRange rating reviewCount inventory createdAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
      ]);

      return { items, total };
    });

    // ── 3. ETag for conditional requests (304 Not Modified) ─────────────────
    const etag = `"${crypto.createHash('md5').update(JSON.stringify(result)).digest('hex')}"`;
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders(etag) });
    }

    return NextResponse.json(
      {
        data: result.items,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNextPage: page * limit < result.total,
        },
        error: null,
      },
      { headers: cacheHeaders(etag) }
    );
  } catch (err) {
    console.error('[GET /api/v1/products]', err);
    return NextResponse.json(
      { data: null, meta: null, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
