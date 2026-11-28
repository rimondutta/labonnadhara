import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Category from '@/models/Category';
import { invalidateCategory } from '@/lib/cache/invalidation';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { buildCategoryPayload } from '@/lib/validation/schemas';

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const categories = await Category.find().sort({ name: 1 }).lean();
    return NextResponse.json({ categories }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET categories error:', getSafeErrorMessage(error));
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
    const parsed = buildCategoryPayload(rawBody, false);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const existing = await Category.findOne({ slug: parsed.data.slug }).select('_id').lean();
    if (existing) {
      return NextResponse.json(
        { error: 'Category slug already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const category = await Category.create({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      image: parsed.data.image ?? '',
      isActive: parsed.data.isActive !== false,
    });

    await invalidateCategory(category._id.toString(), category.slug);

    return NextResponse.json({ category }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin POST category error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
