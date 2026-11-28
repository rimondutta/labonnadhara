import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const shippingSettingsSchema = z
  .object({
    insideChattogramRate: z.number().finite().min(0).max(100_000).optional(),
    outsideChattogramRate: z.number().finite().min(0).max(100_000).optional(),
    freeShippingEnabled: z.boolean().optional(),
    freeShippingMinOrder: z.number().finite().min(0).max(10_000_000).optional(),
    freeShippingZone: z.enum(['all', 'inside_chattogram', 'outside_chattogram']).optional(),
  })
  .strict();

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    return NextResponse.json({ shipping: settings.shipping }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Shipping GET]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const b = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : null;
    const candidate = b
      ? {
          insideChattogramRate:
            b.insideChattogramRate !== undefined ? Number(b.insideChattogramRate) : undefined,
          outsideChattogramRate:
            b.outsideChattogramRate !== undefined ? Number(b.outsideChattogramRate) : undefined,
          freeShippingEnabled:
            b.freeShippingEnabled !== undefined ? Boolean(b.freeShippingEnabled) : undefined,
          freeShippingMinOrder:
            b.freeShippingMinOrder !== undefined ? Number(b.freeShippingMinOrder) : undefined,
          freeShippingZone: b.freeShippingZone,
        }
      : null;

    const parsed = shippingSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid shipping configuration' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'shipping.insideChattogramRate': parsed.data.insideChattogramRate ?? 120,
          'shipping.outsideChattogramRate': parsed.data.outsideChattogramRate ?? 150,
          'shipping.freeShippingEnabled': Boolean(parsed.data.freeShippingEnabled),
          'shipping.freeShippingMinOrder': parsed.data.freeShippingMinOrder ?? 0,
          'shipping.freeShippingZone': parsed.data.freeShippingZone ?? 'all',
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await invalidateSettings();

    return NextResponse.json({ shipping: settings.shipping }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Shipping PUT]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
