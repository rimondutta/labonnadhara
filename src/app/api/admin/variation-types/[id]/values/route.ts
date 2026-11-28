import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import VariationValue from '@/models/VariationValue';
import VariationType from '@/models/VariationType';
import { requireAdminOrManager, isValidObjectId, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const createVariationValueSchema = z
  .object({
    value: z.string().trim().min(1, 'Value is required').max(100, 'Value must be 100 characters or less'),
    colorHex: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || HEX_COLOR_REGEX.test(v),
        'colorHex must be a valid hex color (e.g. #FF0000)'
      ),
    sortOrder: z.number().int('sortOrder must be an integer').min(0).max(9999).optional(),
  })
  .strict();

/** GET /api/admin/variation-types/[id]/values — list all values for a type */
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

    const values = await VariationValue.find({ variationType: id })
      .sort({ sortOrder: 1, value: 1 })
      .lean();

    return NextResponse.json({ values }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin GET variation-type/id/values]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}

/** POST /api/admin/variation-types/[id]/values — create a new value under this type */
export async function POST(
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

    const parsed = createVariationValueSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const variationType = await VariationType.findById(id).lean();
    if (!variationType) {
      return NextResponse.json({ error: 'Variation type not found' }, { status: 404, headers: PRIVATE_NO_STORE_HEADERS });
    }

    const { value, colorHex, sortOrder } = parsed.data;
    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const variationValue = await VariationValue.create({
      variationType: id,
      value,
      slug,
      colorHex: colorHex || null,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ variationValue }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'This value already exists for this variation type' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('[Admin POST variation-type/id/values]', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
  }
}
