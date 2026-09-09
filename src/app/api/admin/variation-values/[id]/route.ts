import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import VariationValue from '@/models/VariationValue';
import Product from '@/models/Product';

/** PUT /api/admin/variation-values/[id] — update a variation value */
export async function PUT(
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

    await connectToDatabase();

    const updates: any = {};
    if (value) {
      updates.value = value.trim();
      updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (colorHex !== undefined) updates.colorHex = colorHex;
    if (sortOrder !== undefined) updates.sortOrder = sortOrder;

    const variationValue = await VariationValue.findByIdAndUpdate(id, updates, { new: true }).lean();

    if (!variationValue) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ variationValue });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'This value already exists for this variation type' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/admin/variation-values/[id] — blocked if used in any product variants */
export async function DELETE(
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

    // Guard: check if any product variant uses this value
    const productCount = await Product.countDocuments({
      'variants.combination.variationValue': id,
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this value is used by ${productCount} product(s). Remove it from those products' variants first.` },
        { status: 400 }
      );
    }

    await VariationValue.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
