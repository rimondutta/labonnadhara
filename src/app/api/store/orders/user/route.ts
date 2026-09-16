import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
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

    const orders = await Order.find({ customerEmail: session.user.email })
      .select('_id items totalAmount shippingCost paymentStatus fulfillmentStatus createdAt shippingAddress invoiceNumber invoiceUrl paymentMethod customerName')
      .populate('items.product', 'images slug')
      .sort({ createdAt: -1 })
      .lean();

    // Collect titles of items missing both image and product ref (legacy orders)
    const legacyTitles = new Set<string>();
    for (const order of orders as any[]) {
      for (const item of (order.items || [])) {
        if (!item.image && !item.product) {
          legacyTitles.add(item.title);
        }
      }
    }

    // Bulk-fetch products by title for legacy orders (1 query total)
    const titleImageMap = new Map<string, string>();
    if (legacyTitles.size > 0) {
      const products = await Product.find(
        { title: { $in: Array.from(legacyTitles) } },
        'title images'
      ).lean() as any[];
      for (const p of products) {
        if (p.images?.[0]?.url) {
          titleImageMap.set(p.title, p.images[0].url);
        }
      }
    }

    // Normalize: ensure every item has an image
    const normalizedOrders = (orders as any[]).map((order) => ({
      ...order,
      items: order.items?.map((item: any) => ({
        ...item,
        image: item.image
          || item.product?.images?.[0]?.url
          || titleImageMap.get(item.title)
          || null,
        product: undefined, // don't expose full product object to client
      })),
    }));

    return NextResponse.json(
      { success: true, orders: normalizedOrders },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: any) {
    console.error('User Orders Fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
