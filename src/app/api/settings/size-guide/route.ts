import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';
import { getOrSetCached } from '@/lib/cache/redis-cache';
import { KEYS } from '@/lib/cache/invalidation';
import { sanitizeSizeGuideHtml } from '@/lib/sanitize';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET() {
  try {
    const sizeGuide = await getOrSetCached(KEYS.sizeGuide(), 300, async () => {
      await connectToDatabase();
      const settings = await Settings.findOne({ key: 'global' })
        .select('sizeGuide')
        .lean() as { sizeGuide?: { enabled?: boolean; content?: string } } | null;

      if (!settings || !settings.sizeGuide) {
        return { enabled: false, content: '' };
      }

      return {
        enabled: Boolean(settings.sizeGuide.enabled),
        content: sanitizeSizeGuideHtml(settings.sizeGuide.content ?? ''),
      };
    });

    return NextResponse.json(
      { sizeGuide },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[Public SizeGuide GET]:', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
