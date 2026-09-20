import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendCapiEvent } from '@/lib/capi';

/**
 * POST /api/admin/settings/pixel/test-capi
 * Fires a test Purchase event to the Meta Conversions API.
 * Admin-only. Useful to verify CAPI token + pixel ID are correct.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sendCapiEvent({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      actionSource: 'website',
      eventSourceUrl: 'https://www.labonnadhara.shop/checkout',
      userData: {
        em: 'test@labonnadhara.shop',
        ph: '01700000000',
        client_ip_address: '127.0.0.1',
        client_user_agent: 'Mozilla/5.0 (Admin Test)',
      },
      customData: {
        value: 1500,
        currency: 'BDT',
        order_id: `test_${Date.now()}`,
        content_ids: ['test-product-id'],
        content_type: 'product',
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
