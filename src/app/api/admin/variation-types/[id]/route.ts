import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import VariationType from '@/models/VariationType';
import VariationValue from '@/models/VariationValue';
import Product from '@/models/Product';

/** GET /api/admin/variation-types/[id] — get a single variation type with its values */
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

    const [variationType, values] = await Promise.all([
      VariationType.findById(id).lean(),
      VariationValue.find({ variationType: id }).sort({ sortOrder: 1, value: 1 }).lean(),
    ]);

    if (!variationType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ variationType, values });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** PUT /api/admin/variation-types/[id] — update name/displayType */
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
    const { name, displayType } = await req.json();

    await connectToDatabase();

    const updates: any = {};
    if (name) {
      updates.name = name.trim();
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (displayType) updates.displayType = displayType;

    const variationType = await VariationType.findByIdAndUpdate(id, updates, { new: true }).lean();

    if (!variationType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ variationType });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A variation type with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/admin/variation-types/[id] — blocked if used by any products */
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

    // Guard: check if any product uses this variation type
    const productCount = await Product.countDocuments({ variationTypes: id });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this variation type is used by ${productCount} product(s). Remove it from those products first.` },
        { status: 400 }
      );
    }

    // Delete all values belonging to this type, then delete the type
    await VariationValue.deleteMany({ variationType: id });
    await VariationType.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
