import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import '@/models/Category';
import '@/models/VariationType';
import '@/models/VariationValue';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { deleteImage } from '@/lib/cloudinary';
import { invalidateProduct } from '@/lib/cache/invalidation';
import { mobileCorsHeaders } from '@/lib/cors';
import { getSafeErrorMessage } from '@/lib/api-error';
import {
  isValidObjectId,
  requireAdminOrManager,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { buildProductUpdatePayload } from '@/lib/validation/schemas';
import { getMergedPublishedReviews } from '@/lib/review-helpers';

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const { id } = await params;

    await connectToDatabase();

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const populateConfig = [
      { path: 'category' },
      { path: 'variationTypes', select: 'name slug displayType' },
      { path: 'variants.combination.variationType', select: 'name slug displayType' },
      { path: 'variants.combination.variationValue', select: 'value colorHex slug' },
    ];

    const product = (
      isMongoId
        ? await Product.findOne({ _id: id, isPublished: true })
            .populate(populateConfig)
            .select('-__v')
            .lean()
        : await Product.findOne({ slug: id, isPublished: true })
            .populate(populateConfig)
            .select('-__v')
            .lean()
    ) as (Record<string, unknown> & { _id: unknown; reviews?: Array<Record<string, unknown>> }) | null;

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const mergedReviews = await getMergedPublishedReviews(
      product._id as string,
      product.reviews as Array<{
        _id?: unknown;
        rating: number;
        title?: string;
        text?: string;
        name?: string;
        date?: Date | string;
        status?: string;
      }>
    );

    return NextResponse.json(
      { success: true, data: { ...product, reviews: mergedReviews } },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[GET /api/products/[id]]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  const headers = { ...CORS_HEADERS, ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: auth.errorResponse.status === 403 ? 'Forbidden' : 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400, headers });
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = buildProductUpdatePayload(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400, headers });
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updatable fields provided' },
        { status: 400, headers }
      );
    }

    await connectToDatabase();

    const existingProduct = (await Product.findById(id).select('images slug').lean()) as {
      images?: Array<{ url?: string }>;
      slug?: string;
    } | null;

    if (!existingProduct) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers });
    }

    if (Array.isArray(parsed.data.images)) {
      const existingUrls = existingProduct.images?.map((img) => img.url || '').filter(Boolean) || [];
      const newUrls = (parsed.data.images as Array<{ url?: string }>)
        .map((img) => img.url || '')
        .filter(Boolean);
      const urlsToDelete = existingUrls.filter(
        (url) => !newUrls.includes(url) && url.includes('cloudinary.com')
      );
      for (const url of urlsToDelete) {
        try {
          await deleteImage(url);
        } catch (err) {
          console.error(`[PUT /api/products/${id}] Cloudinary delete failed:`, err);
        }
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { returnDocument: 'after', runValidators: true }
    );

    await touchProductsTimestamp();
    await invalidateProduct(id, product?.slug || existingProduct.slug);

    return NextResponse.json({ success: true, data: product }, { headers });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Product with this slug already exists' },
        { status: 400, headers }
      );
    }
    console.error('[PUT /api/products/[id]]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  const headers = { ...CORS_HEADERS, ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: auth.errorResponse.status === 403 ? 'Forbidden' : 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: 'Invalid product ID' }, { status: 400, headers });
    }

    await connectToDatabase();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404, headers });
    }

    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.url && img.url.includes('cloudinary.com')) {
          try {
            await deleteImage(img.url);
          } catch (err) {
            console.error(`[DELETE /api/products/${id}] Cloudinary delete failed:`, err);
          }
        }
      }
    }

    await Product.findByIdAndDelete(id);

    await touchProductsTimestamp();
    await invalidateProduct(id, product.slug);

    return NextResponse.json({ success: true, data: { message: 'Product deleted' } }, { headers });
  } catch (error: unknown) {
    console.error('[DELETE /api/products/[id]]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers }
    );
  }
}
