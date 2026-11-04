import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { getSafeErrorMessage } from '@/lib/api-error';

// This handles fetching published products for the storefront
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryQuery = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const idsQuery = searchParams.get('ids');

    await connectToDatabase();

    // Enforce max limits to prevent DB overload
    let requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    if (isNaN(requestedLimit) || requestedLimit <= 0) requestedLimit = 50;
    if (requestedLimit > 100) requestedLimit = 100;

    // Normalize parameters to create deterministic, collision-resistant cache keys
    const normalizedCategory = categoryQuery ? categoryQuery.toLowerCase().trim().slice(0, 100) : '';
    const normalizedSearch = searchQuery ? searchQuery.toLowerCase().trim().slice(0, 100) : '';
    const normalizedIds = idsQuery
      ? idsQuery
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && /^[a-zA-Z0-9_-]+$/.test(id))
          .sort()
          .join(',')
      : '';

    const cacheKey = `products:legacy:cat=${normalizedCategory}&q=${normalizedSearch}&ids=${normalizedIds}&limit=${requestedLimit}`;

    // High Traffic Scaling: Cache search results at the edge
    const { withCache } = await import('@/lib/cache');

    const products = await withCache(cacheKey, 60, async () => {
      // ── Fast path: fetch by IDs (e.g. wishlist) ──
      if (normalizedIds) {
        const idList = normalizedIds.split(',');
        if (idList.length > 0) {
          return await Product.find({ _id: { $in: idList }, isPublished: true })
            .populate('category')
            .select('title price compareAtPrice slug images category badge colors sizes inventory rating reviewCount')
            .limit(requestedLimit)
            .lean();
        }
      }

      // ── Main path: filter by category slug and/or search ──
      if (categoryQuery && !searchQuery) {
        const pipeline = [
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: { path: '$category', preserveNullAndEmpty: true } },
          {
            $match: {
              isPublished: true,
              'category.slug': categoryQuery.trim(),
            },
          },
          { $sort: { createdAt: -1 as const } },
          { $limit: requestedLimit },
          {
            $project: {
              title: 1,
              price: 1,
              compareAtPrice: 1,
              slug: 1,
              images: 1,
              category: 1,
              badge: 1,
              colors: 1,
              sizes: 1,
              inventory: 1,
              rating: 1,
              reviewCount: 1,
              ageRange: 1,
              createdAt: 1,
            },
          },
        ];

        return await Product.aggregate(pipeline);
      }

      // ── Search path: Use text index for sub-millisecond keyword search ──
      const query: Record<string, unknown> = { isPublished: true };
      if (searchQuery) {
        const trimmed = searchQuery.trim();
        // Use MongoDB text search to leverage the compound text index
        query.$text = { $search: trimmed };
      }

      return await Product.find(query)
        .populate('category')
        .select('title price compareAtPrice slug images category badge colors sizes inventory rating reviewCount ageRange createdAt')
        .sort({ createdAt: -1 })
        .limit(requestedLimit)
        .lean();
    });

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    console.error('Store products error:', getSafeErrorMessage(error));
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
