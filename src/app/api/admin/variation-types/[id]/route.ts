import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import VariationType from '@/models/VariationType';
import VariationValue from '@/models/VariationValue';
import Product from '@/models/Product';
import { requireAdminOrManager, isValidObjectId, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const updateVariationTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60).optional(),
    displayType: z.enum(['button', 'swatch', 'dropdown', 'select']).optional(),
  })
  .strict();

/** GET /api/admin/variation-types/[id] — get a single variation type with its values */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation type ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    await connectToDatabase();

    const [variationType, values] = await Promise.all([
      VariationType.findById(id).lean(),
      VariationValue.find({ variationType: id }).sort({ sortOrder: 1, value: 1 }).lean(),
    ]);

    if (!variationType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    }

    return NextResponse.json({ variationType, values }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin GET variation-type/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

/** PUT /api/admin/variation-types/[id] — update name/displayType */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation type ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    const rawBody = await req.json().catch(() => null);
    const candidate = rawBody && typeof rawBody === 'object' ? rawBody : {};

    const parsed = updateVariationTypeSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { name, displayType } = parsed.data;

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    if (name) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (displayType) updates.displayType = displayType;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    const variationType = await VariationType.findByIdAndUpdate(id, updates, { returnDocument: 'after' }).lean();

    if (!variationType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    }

    return NextResponse.json({ variationType }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'A variation type with this name already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('[Admin PUT variation-type/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

/** DELETE /api/admin/variation-types/[id] — blocked if used by any products */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation type ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    await connectToDatabase();

    const productCount = await Product.countDocuments({ variationTypes: id });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this variation type is used by ${productCount} product(s). Remove it from those products first.` },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await VariationValue.deleteMany({ variationType: id });
    await VariationType.findByIdAndDelete(id);

    return NextResponse.json({ success: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin DELETE variation-type/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
