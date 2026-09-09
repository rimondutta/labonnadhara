import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

/** GET /api/admin/settings/couriers — list all courier configs */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ couriers: settings.couriers ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** POST /api/admin/settings/couriers — add a new courier config */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, code, apiKey, apiSecret, webhookSecret, trackingUrlPattern, enabled, notes } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'name and code are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Prevent duplicate codes
    const existing = await Settings.findOne({ key: 'global', 'couriers.code': code });
    if (existing) {
      return NextResponse.json({ error: `A courier with code "${code}" already exists` }, { status: 409 });
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $push: {
          couriers: { name, code, apiKey: apiKey || '', apiSecret: apiSecret || '', webhookSecret: webhookSecret || '', trackingUrlPattern: trackingUrlPattern || '', enabled: Boolean(enabled), notes: notes || '' },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ couriers: settings.couriers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** PUT /api/admin/settings/couriers — update an existing courier config by code */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { code, name, apiKey, apiSecret, webhookSecret, trackingUrlPattern, enabled, notes } = body;

    if (!code) {
      return NextResponse.json({ error: 'code is required to identify the courier' }, { status: 400 });
    }

    await connectToDatabase();

    const update: Record<string, any> = {};
    if (name !== undefined)                update['couriers.$.name']                = name;
    if (apiKey !== undefined)              update['couriers.$.apiKey']              = apiKey;
    if (apiSecret !== undefined)           update['couriers.$.apiSecret']           = apiSecret;
    if (webhookSecret !== undefined)       update['couriers.$.webhookSecret']       = webhookSecret;
    if (trackingUrlPattern !== undefined)  update['couriers.$.trackingUrlPattern']  = trackingUrlPattern;
    if (enabled !== undefined)             update['couriers.$.enabled']             = Boolean(enabled);
    if (notes !== undefined)               update['couriers.$.notes']               = notes;

    const settings = await Settings.findOneAndUpdate(
      { key: 'global', 'couriers.code': code },
      { $set: update },
      { new: true }
    );

    if (!settings) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 });
    }

    return NextResponse.json({ couriers: settings.couriers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** DELETE /api/admin/settings/couriers?code=steadfast — remove a courier config */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'code query param required' }, { status: 400 });
    }

    await connectToDatabase();

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $pull: { couriers: { code } } },
      { new: true }
    );

    return NextResponse.json({ couriers: settings?.couriers ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
