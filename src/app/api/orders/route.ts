import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────────────
// GET /api/orders — returns the signed-in user's order history
// Auth: Bearer JWT (mobile) required
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();

    const orders = await Order.find({ customerEmail: session.user.email })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Map DB shape to the mobile app's Order type
    const mapped = orders.map((order: any) => ({
      _id: order._id.toString(),
      user: session.user.id,
      clerkId: session.user.id,
      orderItems: (order.items || []).map((item: any) => ({
        _id: item._id?.toString() ?? '',
        product: item.product?.toString() ?? '',
        name: item.title ?? '',
        price: item.price ?? 0,
        quantity: item.quantity ?? 1,
        image: '',
      })),
      shippingAddress: {
        fullName: order.customerName ?? '',
        streetAddress: order.shippingAddress?.addressLine1 ?? '',
        city: order.shippingAddress?.city ?? '',
        state: '',
        zipCode: order.shippingAddress?.postcode ?? '',
        phoneNumber: order.shippingAddress?.phone ?? '',
      },
      paymentResult: {
        id: order._id.toString(),
        status: order.paymentStatus ?? 'pending',
      },
      totalPrice: order.totalAmount ?? 0,
      status: mapFulfillmentStatus(order.fulfillmentStatus),
      hasReviewed: false,
      createdAt: order.createdAt?.toISOString() ?? '',
      updatedAt: order.updatedAt?.toISOString() ?? '',
    }));

    return NextResponse.json(
      { success: true, data: mapped, orders: mapped },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function mapFulfillmentStatus(status: string): 'pending' | 'shipped' | 'delivered' {
  if (status === 'shipped') return 'shipped';
  if (status === 'delivered') return 'delivered';
  return 'pending';
}
