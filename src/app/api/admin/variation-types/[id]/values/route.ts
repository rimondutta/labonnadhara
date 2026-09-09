import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import VariationValue from '@/models/VariationValue';
import VariationType from '@/models/VariationType';

/** GET /api/admin/variation-types/[id]/values — list all values for a type */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const values = await VariationValue.find({ variationType: id })
      .sort({ sortOrder: 1, value: 1 })
      .lean();

    return NextResponse.json({ values });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/admin/variation-types/[id]/values — add a new value to a type */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { value, colorHex, sortOrder } = await req.json();

    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Ensure the variation type exists
    const typeExists = await VariationType.exists({ _id: id });
    if (!typeExists) {
      return NextResponse.json({ error: 'Variation type not found' }, { status: 404 });
    }

    const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const variationValue = await VariationValue.create({
      variationType: id,
      value: value.trim(),
      slug,
      colorHex: colorHex || null,
      sortOrder: sortOrder || 0,
    });

    return NextResponse.json({ variationValue }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'This value already exists for this variation type' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
