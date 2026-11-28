import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Settings, { getSettings } from '@/models/Settings';
import { requireAdmin, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import {
  encryptSettingSecret,
  isMaskedSecretPlaceholder,
  maskSettingSecret,
} from '@/lib/crypto-settings';
import { isSafeHttpUrl } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

interface StoredCourier {
  _id?: unknown;
  name: string;
  code: string;
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  trackingUrlPattern?: string;
  enabled?: boolean;
  notes?: string;
}

const trackingPatternSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === '' || isSafeHttpUrl(v.replace(/\{trackingId\}/gi, 'TEST123')),
    'Tracking URL pattern must start with http:// or https://'
  );

const courierCreateSchema = z
  .object({
    name: z.string().trim().min(1, 'Courier name is required').max(100),
    code: z
      .string()
      .trim()
      .min(1, 'Courier code is required')
      .max(60)
      .regex(/^[a-z0-9-]+$/i, 'Code can only contain letters, numbers, and hyphens')
      .transform((c) => c.toLowerCase()),
    apiKey: z.string().max(500).optional(),
    apiSecret: z.string().max(500).optional(),
    webhookSecret: z.string().max(500).optional(),
    trackingUrlPattern: trackingPatternSchema.optional(),
    enabled: z.boolean().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

const courierUpdateSchema = z
  .object({
    code: z.string().trim().min(1, 'Courier code is required').max(60).transform((c) => c.toLowerCase()),
    name: z.string().trim().min(1).max(100).optional(),
    apiKey: z.string().max(500).optional(),
    apiSecret: z.string().max(500).optional(),
    webhookSecret: z.string().max(500).optional(),
    trackingUrlPattern: trackingPatternSchema.optional(),
    enabled: z.boolean().optional(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

function serializeCourier(c: StoredCourier) {
  const maskedApiKey = maskSettingSecret(c.apiKey);
  const maskedApiSecret = maskSettingSecret(c.apiSecret);
  const maskedWebhookSecret = maskSettingSecret(c.webhookSecret);

  return {
    _id: c._id ? String(c._id) : undefined,
    name: c.name,
    code: c.code,
    apiKey: maskedApiKey,
    apiSecret: maskedApiSecret,
    webhookSecret: maskedWebhookSecret,
    hasApiKey: Boolean(maskedApiKey),
    hasApiSecret: Boolean(maskedApiSecret),
    hasWebhookSecret: Boolean(maskedWebhookSecret),
    trackingUrlPattern: c.trackingUrlPattern || '',
    enabled: Boolean(c.enabled),
    notes: c.notes || '',
  };
}

/** GET /api/admin/settings/couriers — list all courier configs (masked secrets) */
export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const settings = await getSettings();

    const couriers = ((settings.couriers ?? []) as StoredCourier[]).map(serializeCourier);
    return NextResponse.json({ couriers }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Couriers GET]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

/** POST /api/admin/settings/couriers — add a new courier config */
export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = courierCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid courier configuration' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { name, code, apiKey, apiSecret, webhookSecret, trackingUrlPattern, enabled, notes } =
      parsed.data;

    await connectToDatabase();

    const existing = await Settings.findOne({ key: 'global', 'couriers.code': code }).select('_id').lean();
    if (existing) {
      return NextResponse.json(
        { error: `A courier with code "${code}" already exists` },
        { status: 409, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $push: {
          couriers: {
            name,
            code,
            apiKey: encryptSettingSecret(apiKey),
            apiSecret: encryptSettingSecret(apiSecret),
            webhookSecret: encryptSettingSecret(webhookSecret),
            trackingUrlPattern: trackingUrlPattern ?? '',
            enabled: Boolean(enabled),
            notes: notes ?? '',
          },
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const couriers = ((settings.couriers ?? []) as StoredCourier[]).map(serializeCourier);
    return NextResponse.json({ couriers }, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Couriers POST]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

/** PUT /api/admin/settings/couriers — update an existing courier config by code */
export async function PUT(req: Request) {
  try {
    const auth = await requireAdmin(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const b = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : null;
    const candidate = b
      ? {
          code: b.code,
          name: b.name,
          apiKey: b.apiKey,
          apiSecret: b.apiSecret,
          webhookSecret: b.webhookSecret,
          trackingUrlPattern: b.trackingUrlPattern,
          enabled: b.enabled,
          notes: b.notes,
        }
      : null;

    const parsed = courierUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid courier update payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { code, name, apiKey, apiSecret, webhookSecret, trackingUrlPattern, enabled, notes } =
      parsed.data;

    await connectToDatabase();

    const update: Record<string, unknown> = {};
    if (name !== undefined) update['couriers.$.name'] = name;
    if (apiKey !== undefined && !isMaskedSecretPlaceholder(apiKey)) {
      update['couriers.$.apiKey'] = encryptSettingSecret(apiKey);
    }
    if (apiSecret !== undefined && !isMaskedSecretPlaceholder(apiSecret)) {
      update['couriers.$.apiSecret'] = encryptSettingSecret(apiSecret);
    }
    if (webhookSecret !== undefined && !isMaskedSecretPlaceholder(webhookSecret)) {
      update['couriers.$.webhookSecret'] = encryptSettingSecret(webhookSecret);
    }
    if (trackingUrlPattern !== undefined) {
      update['couriers.$.trackingUrlPattern'] = trackingUrlPattern;
    }
    if (enabled !== undefined) update['couriers.$.enabled'] = Boolean(enabled);
    if (notes !== undefined) update['couriers.$.notes'] = notes;

    const settings = await Settings.findOneAndUpdate(
      { key: 'global', 'couriers.code': code },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!settings) {
      return NextResponse.json(
        { error: 'Courier not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const couriers = ((settings.couriers ?? []) as StoredCourier[]).map(serializeCourier);
    return NextResponse.json({ couriers }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Couriers PUT]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

/** DELETE /api/admin/settings/couriers?code=steadfast — remove a courier config */
export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toLowerCase();
    if (!code) {
      return NextResponse.json(
        { error: 'code query parameter is required' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $pull: { couriers: { code } } },
      { returnDocument: 'after' }
    );

    const couriers = ((settings?.couriers ?? []) as StoredCourier[]).map(serializeCourier);
    return NextResponse.json({ couriers }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[Admin Couriers DELETE]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
