import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * GET /api/categories
 *
 * Public — no auth required. Returns all active categories.
 * Used by the mobile app to populate category filter chips.
 *
 * Response: { success: true, data: Category[] }
 */
export async function GET() {
  try {
    await connectToDatabase();
    const { withCache } = await import('@/lib/cache');
    const categories = await withCache('api:categories:list', 300, async () => {
      return await Category.find({ isActive: true })
        .select('name slug description image')
        .sort({ name: 1 })
        .limit(100)
        .lean();
    });

    return NextResponse.json(
      { success: true, data: categories },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/categories]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
