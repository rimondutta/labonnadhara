import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import { withCache } from '@/lib/cache';
import crypto from 'crypto';

function cacheHeaders(etag: string) {
  return {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    'ETag': etag,
    'Vary': 'Accept-Encoding',
  };
}

export async function GET(req: Request) {
  try {
    const cacheKey = `categories:v1:list`;

    await connectToDatabase();

    const categories = await withCache(cacheKey, 3600, async () => {
      return await Category.find({ isActive: true })
        .select('name slug image description')
        .lean();
    });

    const etag = `"${crypto.createHash('md5').update(JSON.stringify(categories)).digest('hex')}"`;
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders(etag) });
    }

    return NextResponse.json(
      { data: categories, error: null },
      { headers: cacheHeaders(etag) }
    );
  } catch (err) {
    console.error('[GET /api/v1/categories]', err);
    return NextResponse.json(
      { data: null, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
