import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';
import { mobileCorsHeaders } from '@/lib/cors';

// ─────────────────────────────────────────────────────────────
// GET /api/orders — returns the signed-in user's order history
// Auth: Bearer JWT (mobile) required
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
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
    const mapped = orders.map((order: Record<string, unknown>) => ({
      _id: String(order._id),
      user: session.user.id,
      clerkId: session.user.id,
      orderItems: ((order.items as Record<string, unknown>[]) || []).map((item: Record<string, unknown>) => ({
        _id: String(item._id ?? ''),
        product: String(item.product ?? ''),
        name: String(item.title ?? ''),
        price: Number(item.price ?? 0),
        quantity: Number(item.quantity ?? 1),
        image: '',
      })),
      shippingAddress: {
        fullName: String(order.customerName ?? ''),
        streetAddress: String((order.shippingAddress as Record<string, unknown>)?.addressLine1 ?? ''),
        city: String((order.shippingAddress as Record<string, unknown>)?.city ?? ''),
        state: '',
        zipCode: String((order.shippingAddress as Record<string, unknown>)?.postcode ?? ''),
        phoneNumber: String((order.shippingAddress as Record<string, unknown>)?.phone ?? ''),
      },
      paymentResult: {
        id: String(order._id),
        status: String(order.paymentStatus ?? 'pending'),
      },
      totalPrice: Number(order.totalAmount ?? 0),
      status: mapFulfillmentStatus(String(order.fulfillmentStatus ?? '')),
      hasReviewed: false,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt ?? ''),
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : String(order.updatedAt ?? ''),
    }));

    return NextResponse.json(
      { success: true, data: mapped, orders: mapped },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[GET /api/orders]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}

function mapFulfillmentStatus(status: string): 'pending' | 'shipped' | 'delivered' {
  if (status === 'shipped') return 'shipped';
  if (status === 'delivered') return 'delivered';
  return 'pending';
}
