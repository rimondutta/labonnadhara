import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { mobileCorsHeaders } from '@/lib/cors';
import {
  isValidObjectId,
  requireAuthenticatedUser,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid notification ID.' },
        { status: 400, headers }
      );
    }

    await connectToDatabase();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: auth.session.user.id },
      { $set: { read: true } },
      { returnDocument: 'after' }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found.' },
        { status: 404, headers }
      );
    }

    return NextResponse.json(
      { success: true, data: { _id: notification._id.toString(), read: notification.read } },
      { headers }
    );
  } catch (err) {
    console.error('[PATCH /api/notifications/[id]/read]', getSafeErrorMessage(err));
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500, headers });
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
