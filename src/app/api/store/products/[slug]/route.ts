import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import VariationType from '@/models/VariationType';
import VariationValue from '@/models/VariationValue';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();
    
    // Security: Sanitize input to prevent NoSQL injection
    const sanitizedSlug = typeof slug === 'string' ? slug : String(slug);
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(sanitizedSlug);
    
    const populateConfig = [
      { path: 'category' },
      { path: 'variationTypes' },
      { path: 'variants.combination.variationType' },
      { path: 'variants.combination.variationValue' }
    ];

    let product;
    if (isMongoId) {
      product = await Product.findOne({ _id: sanitizedSlug, isPublished: true })
        .populate(populateConfig)
        .select('-__v')
        .lean();
    } else {
      product = await Product.findOne({ slug: sanitizedSlug, isPublished: true })
        .populate(populateConfig)
        .select('-__v')
        .lean();
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // High Traffic Scaling: Add Cache-Control headers for the Edge Network (CDN)
    // s-maxage=60: Cache on CDN for 60 seconds
    // stale-while-revalidate=3600: Serve stale content for up to 1 hour while updating in background
    return NextResponse.json(
      { product },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
