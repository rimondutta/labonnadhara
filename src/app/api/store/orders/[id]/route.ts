import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import {
  isValidObjectId,
  requireAuthenticatedUser,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) return auth.errorResponse;

    if (!auth.session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const order = await Order.findOne({
      _id: id,
      customerEmail: auth.session.user.email.toLowerCase(),
    })
      .select('-guestAccessTokenHash')
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ order }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Single Order Fetch error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
