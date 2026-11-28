import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';
import { mobileCorsHeaders } from '@/lib/cors';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const categories = await getOrSetCached(KEYS.categories(), 300, async () => {
      await connectToDatabase();
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
  } catch (error: unknown) {
    console.error('[GET /api/categories]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
