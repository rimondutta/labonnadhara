/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the badge icon.
 */
import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { getBearerSession } from '@/lib/mobile-auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS }
      );
    }

    await connectToDatabase();

    const count = await Notification.countDocuments({
      user: session.user.id,
      read: false,
    });

    return NextResponse.json(
      { success: true, count },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[GET /api/notifications/unread-count]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
