import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';
import { getMergedPublishedReviews } from '@/lib/review-helpers';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const sanitizedSlug = typeof slug === 'string' ? slug : String(slug);

    const product = await getOrSetCached(KEYS.productDetail(sanitizedSlug), 60, async () => {
      await connectToDatabase();

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(sanitizedSlug);
      const populateConfig = [
        { path: 'category' },
        { path: 'variationTypes' },
        { path: 'variants.combination.variationType' },
        { path: 'variants.combination.variationValue' },
      ];

      const doc = (
        isMongoId
          ? await Product.findOne({ _id: sanitizedSlug, isPublished: true })
              .populate(populateConfig)
              .select('-__v')
              .lean()
          : await Product.findOne({ slug: sanitizedSlug, isPublished: true })
              .populate(populateConfig)
              .select('-__v')
              .lean()
      ) as (Record<string, unknown> & {
        _id: unknown;
        reviews?: Array<{
          _id?: unknown;
          rating: number;
          title?: string;
          text?: string;
          name?: string;
          date?: Date | string;
          status?: string;
        }>;
      }) | null;

      if (!doc) return null;

      const mergedReviews = await getMergedPublishedReviews(doc._id as string, doc.reviews);
      return { ...doc, reviews: mergedReviews };
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(
      { product },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[Store Product GET]:', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
