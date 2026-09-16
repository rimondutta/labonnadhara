import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ shipping: settings.shipping });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      insideChattogramRate,
      outsideChattogramRate,
      freeShippingEnabled,
      freeShippingMinOrder,
      freeShippingZone,
    } = body;

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'shipping.insideChattogramRate': Number(insideChattogramRate) || 120,
          'shipping.outsideChattogramRate': Number(outsideChattogramRate) || 150,
          'shipping.freeShippingEnabled': Boolean(freeShippingEnabled),
          'shipping.freeShippingMinOrder': Number(freeShippingMinOrder) || 0,
          'shipping.freeShippingZone': freeShippingZone || 'all',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ shipping: settings.shipping });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
