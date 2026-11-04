import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import VariationType from '@/models/VariationType';
import VariationValue from '@/models/VariationValue';
import { getSafeErrorMessage } from '@/lib/api-error';

/** GET /api/admin/variation-types — list all variation types with value counts */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const types = await VariationType.find({}).sort({ name: 1 }).lean();

    // Get value counts in one aggregation
    const counts = await VariationValue.aggregate([
      { $group: { _id: '$variationType', count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    const result = types.map((t: any) => ({
      ...t,
      valueCount: countMap[t._id.toString()] || 0,
    }));

    return NextResponse.json({ variationTypes: result });
  } catch (error: unknown) {
    console.error('Admin GET variation-types error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

/** POST /api/admin/variation-types — create a new variation type */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, displayType } = await req.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    await connectToDatabase();

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const variationType = await VariationType.create({
      name: name.trim(),
      slug,
      displayType: displayType || 'button',
    });

    return NextResponse.json({ variationType }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'A variation type with this name already exists' }, { status: 400 });
    }
    console.error('Admin POST variation-type error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
