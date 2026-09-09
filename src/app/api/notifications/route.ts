/**
 * GET /api/notifications
 *
 * Returns the logged-in customer's notifications, most recent first.
 * Supports pagination via ?page=1&limit=20 query params.
 */
import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import User from '@/models/User';
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

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    // Find the user's MongoDB _id from their email (JWT has id directly)
    const notifications = await Notification.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments({ user: session.user.id });

    return NextResponse.json(
      {
        success: true,
        data: notifications.map((n: any) => ({
          _id: n._id.toString(),
          title: n.title,
          body: n.body,
          type: n.type,
          read: n.read,
          orderId: n.order?.toString() ?? null,
          createdAt: n.createdAt?.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[GET /api/notifications]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
