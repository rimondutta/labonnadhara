import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';

async function getSettings() {
  return Settings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await getSettings();

    return NextResponse.json({ sizeGuide: settings.sizeGuide });
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
    const { enabled, content } = body;

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'sizeGuide.enabled': Boolean(enabled),
          'sizeGuide.content': content ?? '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await invalidateSettings();

    return NextResponse.json({ sizeGuide: settings.sizeGuide });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
