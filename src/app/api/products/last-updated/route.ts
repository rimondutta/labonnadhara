import { NextResponse } from 'next/server';
import { getProductsTimestamp } from '@/lib/lastUpdated';
import { mobileCorsHeaders } from '@/lib/cors';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const timestamp = await getProductsTimestamp();

    return NextResponse.json(
      {
        success: true,
        data: {
          timestamp,
          iso: timestamp ? new Date(timestamp).toISOString() : null,
        },
      },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 's-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error: unknown) {
    console.error('[GET /api/products/last-updated]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
