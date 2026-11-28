import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { mobileCorsHeaders } from '@/lib/cors';
import { requireAuthenticatedUser, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function PATCH(req: NextRequest) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    await connectToDatabase();

    const result = await Notification.updateMany(
      { user: auth.session.user.id, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true, updated: result.modifiedCount }, { headers });
  } catch (err) {
    console.error('[PATCH /api/notifications/read-all]', getSafeErrorMessage(err));
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
