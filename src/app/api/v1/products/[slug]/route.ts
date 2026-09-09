import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { withCache } from '@/lib/cache';
import crypto from 'crypto';

function cacheHeaders(etag: string) {
  return {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    'ETag': etag,
    'Vary': 'Accept-Encoding',
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cacheKey = `product:v1:${slug}`;

    await connectToDatabase();

    const product = await withCache(cacheKey, 60, async () => {
      return await Product.findOne({ slug, isPublished: true })
        .populate('category', 'name slug')
        .populate('variationTypes')
        .populate('variants.combination.variationType')
        .populate('variants.combination.variationValue')
        .select('-__v')
        .lean();
    });

    if (!product) {
      return NextResponse.json(
        { data: null, error: 'Product not found' },
        { status: 404 }
      );
    }

    const etag = `"${crypto.createHash('md5').update(JSON.stringify(product)).digest('hex')}"`;
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders(etag) });
    }

    return NextResponse.json(
      { data: product, error: null },
      { headers: cacheHeaders(etag) }
    );
  } catch (err) {
    console.error('[GET /api/v1/products/[slug]]', err);
    return NextResponse.json(
      { data: null, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
