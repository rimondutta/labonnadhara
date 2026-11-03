import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';

async function getSettings() {
  return Settings.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

export async function GET(req: Request) {
  try {
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session || !['admin', 'manager'].includes((session.user as { role?: string }).role ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await getSettings();

    return NextResponse.json({ facebookPixel: settings.facebookPixel });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session || !['admin', 'manager'].includes((session.user as { role?: string }).role ?? '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { pixelId, accessToken, enabled, testEventCode } = body;

    const trimmedPixelId = pixelId ? String(pixelId).trim() : '';

    // Validate: Meta Pixel IDs must be 5 to 20 digits numeric string
    if (trimmedPixelId && !/^\d{5,20}$/.test(trimmedPixelId)) {
      return NextResponse.json(
        { error: 'Pixel ID must be a numeric string between 5 and 20 digits.' },
        { status: 400 }
      );
    }

    if (enabled && !trimmedPixelId) {
      return NextResponse.json(
        { error: 'Cannot enable Facebook Pixel without a valid numeric Pixel ID.' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'facebookPixel.pixelId': trimmedPixelId,
          'facebookPixel.accessToken': accessToken ? String(accessToken).trim() : '',
          'facebookPixel.enabled': Boolean(enabled),
          'facebookPixel.testEventCode': testEventCode ? String(testEventCode).trim() : '',
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    await invalidateSettings();

    return NextResponse.json({ success: true, facebookPixel: settings.facebookPixel });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
