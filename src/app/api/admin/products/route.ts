import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { invalidateProduct } from '@/lib/cache/invalidation';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { buildProductCreatePayload } from '@/lib/validation/schemas';

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();
    const [products, total] = await Promise.all([
      Product.find()
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(),
    ]);

    return NextResponse.json(
      {
        products,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Admin GET products error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = buildProductCreatePayload(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const product = await Product.create(parsed.data);

    await touchProductsTimestamp();
    await invalidateProduct(product._id.toString(), product.slug);

    return NextResponse.json({ product }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('Admin POST products error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
