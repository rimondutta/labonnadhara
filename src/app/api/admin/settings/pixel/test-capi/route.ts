import { NextResponse } from 'next/server';
import { sendCapiEvent } from '@/lib/capi';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const result = await sendCapiEvent({
      eventName: 'Purchase',
      eventTime: Math.floor(Date.now() / 1000),
      actionSource: 'website',
      eventSourceUrl: 'https://www.labonnadhara.shop/checkout',
      userData: {
        em: 'test@labonnadhara.shop',
        ph: '01700000000',
        client_ip_address: '127.0.0.1',
        client_user_agent: 'Labonnadhara-CAPI-Test/1.0',
      },
      customData: {
        value: 100,
        currency: 'BDT',
        content_type: 'product',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test event to Meta CAPI' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        message: 'Test CAPI event sent successfully! Check Meta Events Manager -> Test Events.',
        data: result.data,
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[Admin Pixel Test CAPI]:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
