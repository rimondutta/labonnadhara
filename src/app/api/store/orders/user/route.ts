import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getBearerSession(req) || await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    await connectToDatabase();

    // Performance: .select() returns only fields the /account UI needs (reduces serialization size)
    // Performance: .lean() returns plain JS objects instead of full Mongoose Documents (~2-3x faster)
    const orders = await Order.find({ customerEmail: session.user.email })
      .select('_id items totalAmount shippingCost paymentStatus fulfillmentStatus createdAt shippingAddress invoiceNumber invoiceUrl paymentMethod customerName')
      .sort({ createdAt: -1 })
      .lean();

    // Security: Explicitly mark as private — prevents CDN/proxy from caching user-specific data
    return NextResponse.json(
      { success: true, orders },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('User Orders Fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
