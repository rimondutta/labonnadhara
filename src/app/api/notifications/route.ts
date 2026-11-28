import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { mobileCorsHeaders } from '@/lib/cors';
import { requireAuthenticatedUser, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const [notifications, total] = await Promise.all([
      Notification.find({ user: auth.session.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as Promise<
        Array<{
          _id: { toString(): string };
          title: string;
          body: string;
          type?: string;
          data?: unknown;
          read: boolean;
          createdAt: Date;
        }>
      >,
      Notification.countDocuments({ user: auth.session.user.id }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: notifications.map((n) => ({
          _id: n._id.toString(),
          title: n.title,
          body: n.body,
          type: n.type,
          data: n.data,
          read: n.read,
          createdAt: n.createdAt,
        })),
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { headers }
    );
  } catch (err) {
    console.error('[GET /api/notifications]', getSafeErrorMessage(err));
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}
