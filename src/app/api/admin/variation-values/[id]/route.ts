import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import VariationValue from '@/models/VariationValue';
import Product from '@/models/Product';
import { requireAdminOrManager, isValidObjectId, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const updateVariationValueSchema = z
  .object({
    value: z.string().trim().min(1, 'Value is required').max(100, 'Value must be 100 characters or less').optional(),
    colorHex: z
      .string()
      .trim()
      .nullable()
      .optional()
      .refine(
        (v) => v === null || v === undefined || v === '' || HEX_COLOR_REGEX.test(v),
        'colorHex must be a valid hex color (e.g. #FF0000) or null'
      ),
    sortOrder: z.number().int('sortOrder must be an integer').min(0).max(9999).optional(),
  })
  .strict();

/** GET /api/admin/variation-values/[id] — get a single variation value */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation value ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    await connectToDatabase();

    const variationValue = await VariationValue.findById(id).lean();
    if (!variationValue) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    }

    return NextResponse.json({ variationValue }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin GET variation-value/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

/** PUT /api/admin/variation-values/[id] — update value, colorHex, sortOrder */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation value ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    const rawBody = await req.json().catch(() => null);
    const candidate = rawBody && typeof rawBody === 'object' ? rawBody : {};

    const parsed = updateVariationValueSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { value, colorHex, sortOrder } = parsed.data;

    await connectToDatabase();

    const updates: Record<string, unknown> = {};
    if (value !== undefined) {
      updates.value = value;
      updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (colorHex !== undefined) updates.colorHex = colorHex || null;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    const variationValue = await VariationValue.findByIdAndUpdate(id, updates, { returnDocument: 'after' }).lean();

    if (!variationValue) {
      return NextResponse.json({ error: 'Not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    }

    return NextResponse.json({ variationValue }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'This value already exists for this variation type' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('[Admin PUT variation-value/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

/** DELETE /api/admin/variation-values/[id] — blocked if used in any product variants */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid variation value ID' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
    }

    await connectToDatabase();

    const productCount = await Product.countDocuments({
      'variants.combination.variationValue': id,
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this value is used by ${productCount} product(s). Remove it from those products' variants first.` },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await VariationValue.findByIdAndDelete(id);

    return NextResponse.json({ success: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin DELETE variation-value/id]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
