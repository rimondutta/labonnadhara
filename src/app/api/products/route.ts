import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { NextRequest } from 'next/server';
import { mobileCorsHeaders } from '@/lib/cors';
import { getSafeErrorMessage } from '@/lib/api-error';

// ─────────────────────────────────────────────────────────────
// GET /api/products
// Public product list — safe for mobile, no auth required.
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const { searchParams } = new URL(req.url);

    // — Pagination —
    const page  = Math.max(1, parseInt(searchParams.get('page')  || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip  = (page - 1) * limit;

    // — Filters —
    const categorySlug = searchParams.get('category');
    const searchQuery  = searchParams.get('search');
    const sort         = searchParams.get('sort') || 'newest';
    const minPrice     = parseFloat(searchParams.get('minPrice') || '0') || 0;
    const maxPrice     = parseFloat(searchParams.get('maxPrice') || '0') || 0;

    await connectToDatabase();

    // Build the base filter
    const filter: Record<string, any> = { isPublished: true };

    if (searchQuery) {
      // Use MongoDB text index for high-performance searching instead of slow regex
      filter.$text = { $search: searchQuery };
    }

    if (minPrice > 0) filter.price = { ...filter.price, $gte: minPrice };
    if (maxPrice > 0) filter.price = { ...filter.price, $lte: maxPrice };

    // Sort mapping
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest:    { createdAt: -1 },
      'price-asc':  { price: 1 },
      'price-desc': { price: -1 },
    };
    const sortObj = sortMap[sort] ?? sortMap.newest;

    // Generate a normalized unique cache key based on query params
    const normCategory = categorySlug ? categorySlug.toLowerCase().trim() : 'all';
    const normSearch = searchQuery ? searchQuery.toLowerCase().trim().slice(0, 100) : 'none';
    const cacheKey = `api:products:list:${normCategory}-${normSearch}-${sort}-${page}-${limit}-${minPrice}-${maxPrice}`;

    // Wrap the entire data fetching block in Redis cache (60s TTL)
    const { withCache } = await import('@/lib/cache');
    const { products, total } = await withCache(cacheKey, 60, async () => {
      // If filtering by category slug, resolve via aggregation (single DB round-trip)
      if (categorySlug) {
        const pipeline: any[] = [
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
          {
            $match: {
              ...filter,
              'category.slug': categorySlug,
            },
          },
          { $sort: sortObj },
        ];

        // Count before pagination
        const countPipeline = [...pipeline, { $count: 'total' }];
        const [countResult] = await Product.aggregate(countPipeline);
        const total = countResult?.total ?? 0;

        // Apply pagination
        pipeline.push({ $skip: skip }, { $limit: limit });
        // Populate variation data
        pipeline.push({
          $lookup: {
            from: 'variationtypes',
            localField: 'variationTypes',
            foreignField: '_id',
            as: 'variationTypes',
          },
        });

        const products = await Product.aggregate(pipeline);
        return { products, total };
      }

      // Standard query path (no category filter)
      const [fetchedProducts, fetchedTotal] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug image')
          .populate('variationTypes')
          .select('-__v')
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter),
      ]);

      return { products: fetchedProducts, total: fetchedTotal };
    });

    return NextResponse.json(
      {
        success: true,
        data: products,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (error: unknown) {
    console.error('[GET /api/products]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/products — Create product (admin / manager only)
// Auth: NextAuth session (web) OR Bearer JWT (mobile admin)
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    // Accept both NextAuth session (web admin) and Bearer JWT (mobile admin)
    const session =
      (await getBearerSession(req)) ??
      (await getServerSession(authOptions));

    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const data = await req.json();

    // Sanitize image URLs
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.filter(
        (img: { url?: string }) => img.url && (img.url.startsWith('http') || img.url.startsWith('/'))
      );
    }

    await connectToDatabase();
    const product = await Product.create(data);

    // Bump the last-updated timestamp so mobile apps detect the change
    await touchProductsTimestamp();

    return NextResponse.json(
      { success: true, data: product },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Product with this slug already exists' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    console.error('[POST /api/products]', error);
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
