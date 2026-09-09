/**
 * PATCH /api/notifications/read-all
 *
 * Marks all of the logged-in user's notifications as read.
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

export async function PATCH(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS }
      );
    }

    await connectToDatabase();

    const result = await Notification.updateMany(
      { user: session.user.id, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json(
      { success: true, updated: result.modifiedCount },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[PATCH /api/notifications/read-all]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
