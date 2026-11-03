import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { isRateLimited } from '@/lib/ratelimit';
import { calculateOrderTotals } from '@/lib/order-pricing';

const OrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  title: z.string().min(1).optional(),
  image: z.string().optional(),
});

const OrderSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Invalid email address").optional(),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  totalAmount: z.number().min(0).optional(),
  shippingCost: z.number().min(0).default(0),
  shippingZone: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'bkash', 'card']).default('cod'),
  couponCode: z.string().optional(),
  shippingAddress: z.object({
    addressLine1: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    postcode: z.string().default(""),
    country: z.string().default("Bangladesh"),
    phone: z.string().min(1, "Phone is required"),
  }),
});

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    
    if (await isRateLimited(ip)) {
      return NextResponse.json(
        { data: null, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = OrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const orderData = parsed.data;

    await connectToDatabase();

    // ─── AUTHORITATIVE SERVER-SIDE PRICING HELPER ─────────────────────────────
    let pricingResult;
    try {
      pricingResult = await calculateOrderTotals({
        items: orderData.items,
        couponCode: orderData.couponCode,
        shippingZone: orderData.shippingZone,
        checkStock: true,
      });
    } catch (pricingErr: unknown) {
      return NextResponse.json(
        { data: null, error: (pricingErr as Error).message || 'Stock or pricing validation failed' },
        { status: 400 }
      );
    }

    const { verifiedItems, totalAmount, shippingCost, inventoryOperations } = pricingResult;

    const orderDoc = {
      customerName: orderData.customerName.trim(),
      customerEmail: orderData.customerEmail?.toLowerCase().trim(),
      items: verifiedItems,
      totalAmount,   // ← server-calculated, not client-supplied
      shippingCost,
      shippingZone: orderData.shippingZone,
      notes: orderData.notes,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    };

    const order = await Order.create(orderDoc);

    // Atomically deduct inventory
    if (inventoryOperations.length > 0) {
      try {
        await Product.bulkWrite(inventoryOperations, { ordered: false });
      } catch (stockErr) {
        console.error('[v1/orders] Stock deduction failed:', stockErr);
      }
    }

    // Background tasks (Invoice, Email, Telegram)
    const notificationPayload = {
      orderId: order._id.toString(),
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail || '',
      totalAmount,
      shippingCost,
      shippingZone: orderData.shippingZone,
      notes: orderData.notes,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      items: verifiedItems.map((item) => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        productId: item.product,
        variantId: item.variantId,
        image: item.image,
      })),
    };

    await Promise.allSettled([
      import('@/lib/invoice/generateInvoicePdf').then(({ generateInvoiceForOrder }) => generateInvoiceForOrder(order._id.toString())),
      orderData.customerEmail ? import('@/lib/nodemailer').then(({ sendOrderConfirmationEmail }) => sendOrderConfirmationEmail(notificationPayload)) : Promise.resolve(),
      import('@/lib/telegram').then(({ sendTelegramNotification }) => sendTelegramNotification(notificationPayload)),
      import('@/lib/googleSheets').then(({ appendOrderToSheet }) =>
        appendOrderToSheet({
          orderId: order._id.toString(),
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          phone: orderData.shippingAddress.phone,
          addressLine1: orderData.shippingAddress.addressLine1,
          city: orderData.shippingAddress.city,
          paymentMethod: orderData.paymentMethod,
          items: verifiedItems.map((i) => ({ title: i.title, quantity: i.quantity, price: i.price })),
          shippingCost,
          totalAmount,
          fulfillmentStatus: 'unfulfilled',
        })
      ),
    ]);

    // ── Meta Conversions API — Purchase ──
    try {
      const cookieStore = await cookies();
      const fbp = cookieStore.get('_fbp')?.value;
      const fbc = cookieStore.get('_fbc')?.value;
      const clientIp = forwarded?.split(',')[0]?.trim() || ip;
      const { sendCapiEvent, hashData } = await import('@/lib/capi');
      await sendCapiEvent({
        eventName: 'Purchase',
        eventTime: Math.floor(Date.now() / 1000),
        eventId: order._id.toString(),
        eventSourceUrl: 'https://labonnadhara.shop/checkout',
        actionSource: 'website',
        userData: {
          em: orderData.customerEmail ? hashData(orderData.customerEmail) : undefined,
          ph: orderData.shippingAddress.phone ? hashData(orderData.shippingAddress.phone) : undefined,
          fbp,
          fbc,
          client_ip_address: clientIp,
          client_user_agent: req.headers.get('user-agent') || '',
        },
        customData: {
          value: totalAmount,
          currency: 'BDT',
          content_type: 'product',
          content_ids: verifiedItems.map((i) => i.product.toString()),
          num_items: verifiedItems.reduce((acc, i) => acc + i.quantity, 0),
          order_id: order._id.toString(),
        },
      });
    } catch (capiErr) {
      console.error('[CAPI Purchase] Failed to fire purchase event:', capiErr);
    }

    return NextResponse.json(
      { data: { orderId: order._id.toString() }, error: null },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { data: null, error: 'Internal server error. Failed to create order.' },
      { status: 500 }
    );
  }
}
