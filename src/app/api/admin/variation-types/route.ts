import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import VariationType from '@/models/VariationType';
import VariationValue from '@/models/VariationValue';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';

const createVariationTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(60),
    displayType: z.enum(['button', 'swatch', 'dropdown', 'select']).default('button'),
  })
  .strict();

/** GET /api/admin/variation-types — list all variation types with value counts */
export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();

    const [types, counts] = await Promise.all([
      VariationType.find({}).sort({ name: 1 }).lean() as Promise<Array<{ _id: { toString(): string } }>>,
      VariationValue.aggregate([{ $group: { _id: '$variationType', count: { $sum: 1 } } }]),
    ]);

    const countMap = new Map<string, number>();
    for (const c of counts) {
      countMap.set(String(c._id), c.count);
    }

    const result = types.map((t) => ({
      ...t,
      valueCount: countMap.get(t._id.toString()) || 0,
    }));

    return NextResponse.json({ variationTypes: result }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET variation-types error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

/** POST /api/admin/variation-types — create a new variation type */
export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const bodyObj = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : null;
    const candidate = bodyObj ? { name: bodyObj.name, displayType: bodyObj.displayType } : null;

    const parsed = createVariationTypeSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Name is required' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const slug = parsed.data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const variationType = await VariationType.create({
      name: parsed.data.name,
      slug,
      displayType: parsed.data.displayType,
    });

    return NextResponse.json({ variationType }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'A variation type with this name already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }
    console.error('Admin POST variation-type error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
