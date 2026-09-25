import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { deleteImage } from '@/lib/cloudinary';
import { NextRequest } from 'next/server';
import { invalidateProduct } from '@/lib/cache/invalidation';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────────────
// GET /api/products/[id]
// Public — no auth required. Accepts MongoDB _id OR slug.
// Returns the full product with all variation data populated.
// Response: { success: true, data: Product }
// ─────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // Accept both MongoDB ObjectId and slug (for flexibility)
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);

    const populateConfig = [
      { path: 'category', select: 'name slug image' },
      { path: 'variationTypes' },
      { path: 'variants.combination.variationType' },
      { path: 'variants.combination.variationValue' },
    ];

    const product = isMongoId
      ? await Product.findOne({ _id: id, isPublished: true })
          .populate(populateConfig)
          .select('-__v')
          .lean()
      : await Product.findOne({ slug: id, isPublished: true })
          .populate(populateConfig)
          .select('-__v')
          .lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: product },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/products/[id]]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/products/[id] — Update product (admin / manager only)
// ─────────────────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session =
      (await getBearerSession(req)) ??
      (await getServerSession(authOptions));

    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    const data = await req.json();

    // Sanitize image URLs
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.filter(
        (img: any) => img.url && (img.url.startsWith('http') || img.url.startsWith('/'))
      );
    }

    await connectToDatabase();

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Delete Cloudinary images that were removed in this update
    const existingUrls = existingProduct.images?.map((img: any) => img.url) || [];
    const newUrls = data.images?.map((img: any) => img.url) || [];
    const urlsToDelete = existingUrls.filter(
      (url: string) => !newUrls.includes(url) && url.includes('cloudinary.com')
    );
    for (const url of urlsToDelete) {
      try {
        await deleteImage(url);
      } catch (err) {
        console.error(`[PUT /api/products/${id}] Cloudinary delete failed:`, err);
      }
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });

    // Bump last-updated so mobile polling detects this change
    await touchProductsTimestamp();

    // Invalidate Redis caches + trigger Next.js ISR revalidate
    await invalidateProduct(id, product?.slug);

    return NextResponse.json(
      { success: true, data: product },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'Product with this slug already exists' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/products/[id] — Delete product (admin / manager only)
// ─────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session =
      (await getBearerSession(req)) ??
      (await getServerSession(authOptions));

    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Delete Cloudinary images
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

    // Bump last-updated so mobile polling detects this deletion
    await touchProductsTimestamp();

    // Invalidate Redis caches + trigger Next.js ISR revalidate
    await invalidateProduct(id, product.slug);

    return NextResponse.json(
      { success: true, data: { message: 'Product deleted' } },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
