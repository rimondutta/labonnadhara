import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Settings, { getSettings } from '@/models/Settings';
import { invalidateSettings } from '@/lib/cache/invalidation';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import {
  encryptSettingSecret,
  isMaskedSecretPlaceholder,
  maskSettingSecret,
} from '@/lib/crypto-settings';
import { getSafeErrorMessage } from '@/lib/api-error';

const pixelSettingsUpdateSchema = z
  .object({
    pixelId: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === '' || /^\d{5,20}$/.test(v), 'Meta Pixel ID must be a 5-20 digit numeric string')
      .optional(),
    accessToken: z.string().max(1000).optional(),
    enabled: z.boolean().optional(),
    testEventCode: z.string().trim().max(50).optional(),
  })
  .strict();

function serializePixelResponse(pixel?: {
  pixelId?: string;
  accessToken?: string;
  enabled?: boolean;
  testEventCode?: string;
}) {
  const maskedToken = maskSettingSecret(pixel?.accessToken);
  return {
    pixelId: pixel?.pixelId || '',
    accessToken: maskedToken,
    hasAccessToken: Boolean(maskedToken),
    enabled: Boolean(pixel?.enabled),
    testEventCode: pixel?.testEventCode || '',
  };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const settings = await getSettings();

    return NextResponse.json(
      { facebookPixel: serializePixelResponse(settings.facebookPixel) },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Pixel GET]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdminOrManager(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const bodyObj = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : null;
    const candidate = bodyObj
      ? {
          pixelId: bodyObj.pixelId,
          accessToken: bodyObj.accessToken,
          enabled: bodyObj.enabled,
          testEventCode: bodyObj.testEventCode,
        }
      : null;

    const parsed = pixelSettingsUpdateSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid pixel settings' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const updateSet: Record<string, unknown> = {
      'facebookPixel.pixelId': parsed.data.pixelId ?? '',
      'facebookPixel.enabled': Boolean(parsed.data.enabled),
      'facebookPixel.testEventCode': parsed.data.testEventCode ?? '',
    };

    // Only overwrite stored accessToken when caller submits a non-masked value
    if (parsed.data.accessToken !== undefined && !isMaskedSecretPlaceholder(parsed.data.accessToken)) {
      updateSet['facebookPixel.accessToken'] = encryptSettingSecret(parsed.data.accessToken);
    }

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: updateSet },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await invalidateSettings();

    return NextResponse.json(
      {
        message: 'Facebook Pixel settings updated successfully',
        facebookPixel: serializePixelResponse(settings.facebookPixel),
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Pixel PUT]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
