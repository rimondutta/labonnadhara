import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Category from '@/models/Category';

// This handles fetching published products for the storefront - REBUILD TRIGGER
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryQuery = searchParams.get('category');
    const searchQuery = searchParams.get('search');
    const idsQuery = searchParams.get('ids');
    
    await connectToDatabase();

    // Enforce max limits to prevent DB overload
    let requestedLimit = parseInt(searchParams.get('limit') || '50');
    if (requestedLimit > 100) requestedLimit = 100;
    if (requestedLimit <= 0) requestedLimit = 50;

    // High Traffic Scaling: Cache search results at the edge
    const { withCache } = await import('@/lib/cache');
    const cacheKey = `products:legacy:${searchParams.toString()}`;
    
    const products = await withCache(cacheKey, 60, async () => {
      // ── Fast path: fetch by IDs (e.g. wishlist) ──
      if (idsQuery) {
        const idList = idsQuery.split(',').filter(id => id.length > 0);
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
          {
            $match: {
              isPublished: true,
              'category.slug': categoryQuery,
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: requestedLimit },
          {
            $project: {
              title: 1, price: 1, compareAtPrice: 1, slug: 1, images: 1, category: 1,
              badge: 1, colors: 1, sizes: 1, inventory: 1, rating: 1,
              reviewCount: 1, ageRange: 1, createdAt: 1,
            },
          },
        ];

        return await Product.aggregate(pipeline);
      }

      // ── Search path ──
      let query: any = { isPublished: true };
      if (searchQuery) {
        const escapedSearch = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { title: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } },
        ];
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
  } catch (error: any) {
    // Security: Don't leak raw error stack traces to the client in production
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
