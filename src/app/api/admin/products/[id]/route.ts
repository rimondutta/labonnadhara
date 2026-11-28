import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { deleteImage } from '@/lib/cloudinary';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { invalidateProduct } from '@/lib/cache/invalidation';
import { getSafeErrorMessage } from '@/lib/api-error';
import {
  requireAdminOrManager,
  isValidObjectId,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { buildProductUpdatePayload } from '@/lib/validation/schemas';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const product = await Product.findById(id).populate('category').lean();
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ product }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET product error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = buildProductUpdatePayload(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json(
        { error: 'No valid updatable fields provided' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const existingProduct = await Product.findById(id).select('images slug').lean() as {
      images?: Array<{ url?: string }>;
      slug?: string;
    } | null;

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
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
        } catch (cloudinaryError) {
          console.error(`Failed to delete replaced Cloudinary image: ${url}`, cloudinaryError);
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

    return NextResponse.json({ product }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('Admin PUT product error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.url && img.url.includes('cloudinary.com')) {
          try {
            await deleteImage(img.url);
          } catch (cloudinaryError) {
            console.error(`Failed to delete Cloudinary image: ${img.url}`, cloudinaryError);
          }
        }
      }
    }

    await Product.findByIdAndDelete(id);

    await touchProductsTimestamp();
    await invalidateProduct(id, product.slug);

    return NextResponse.json(
      { message: 'Product and associated images deleted' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Admin DELETE product error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
