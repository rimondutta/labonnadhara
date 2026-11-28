import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Settings, { getSettings } from '@/models/Settings';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { sanitizeSizeGuideHtml } from '@/lib/sanitize';
import { invalidateSettings } from '@/lib/cache/invalidation';
import { getSafeErrorMessage } from '@/lib/api-error';

const sizeGuideUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    content: z.string().max(50000, 'Size guide HTML content is too large').optional(),
  })
  .strict();

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const settings = await getSettings();

    const rawContent = settings.sizeGuide?.content ?? '';
    return NextResponse.json(
      {
        sizeGuide: {
          enabled: Boolean(settings.sizeGuide?.enabled),
          content: sanitizeSizeGuideHtml(rawContent),
        },
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin SizeGuide GET]:', getSafeErrorMessage(error));
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
    const parsed = sizeGuideUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid size guide payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const sanitizedContent = sanitizeSizeGuideHtml(parsed.data.content ?? '');

    await connectToDatabase();
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      {
        $set: {
          'sizeGuide.enabled': Boolean(parsed.data.enabled),
          'sizeGuide.content': sanitizedContent,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    await invalidateSettings();

    return NextResponse.json(
      {
        sizeGuide: {
          enabled: Boolean(settings.sizeGuide?.enabled),
          content: sanitizeSizeGuideHtml(settings.sizeGuide?.content ?? ''),
        },
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin SizeGuide PUT]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
