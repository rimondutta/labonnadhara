/**
 * PATCH /api/notifications/[id]/read
 *
 * Marks a single notification as read. Scoped to the logged-in user
 * to prevent users from marking other users' notifications.
 */
import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { getBearerSession } from '@/lib/mobile-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: session.user.id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found.' },
        { status: 404, headers: CORS }
      );
    }

    return NextResponse.json(
      { success: true, data: { _id: notification._id.toString(), read: notification.read } },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[PATCH /api/notifications/:id/read]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
