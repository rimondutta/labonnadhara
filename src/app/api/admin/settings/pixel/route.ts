import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';

async function getSettings() {
  // Upsert the singleton doc
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

    return NextResponse.json({ facebookPixel: settings.facebookPixel });
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
    const { pixelId, accessToken, enabled, testEventCode } = body;

    // Validate: Meta Pixel IDs are numeric-only strings (typically 15-16 digits)
    if (pixelId && !/^\d+$/.test(pixelId.trim())) {
      return NextResponse.json(
        { error: 'Pixel ID must be a numeric string (digits only).' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'facebookPixel.pixelId': pixelId?.trim() ?? '',
          'facebookPixel.accessToken': accessToken?.trim() ?? '',
          'facebookPixel.enabled': Boolean(enabled),
          'facebookPixel.testEventCode': testEventCode?.trim() ?? '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await invalidateSettings();

    return NextResponse.json({ facebookPixel: settings.facebookPixel });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
