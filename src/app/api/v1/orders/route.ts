import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { isRateLimited } from '@/lib/ratelimit';

const OrderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99), // Sanitize: cap qty at 99
  title: z.string().min(1),
  image: z.string().optional(),
  // price is intentionally removed from client schema — server will enforce it
});

const OrderSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Invalid email address").optional(),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  totalAmount: z.number().min(0), // Client value — will be overwritten by server calculation
  shippingCost: z.number().min(0).default(0),
  shippingZone: z.string().optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cod', 'bkash', 'card']).default('cod'),
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

    // ─── SERVER-SIDE PRICE ENFORCEMENT ───────────────────────────────────────
    // NEVER trust prices from the client. Fetch real prices from the DB.
    const productIds = [...new Set(orderData.items.map(i => i.productId))];
    const dbProducts = await Product.find({ _id: { $in: productIds } })
      .select('_id price variants')
      .lean() as any[];

    const productMap = new Map(dbProducts.map(p => [p._id.toString(), p]));

    const verifiedItems = orderData.items.map(item => {
      const dbProduct = productMap.get(item.productId);
      if (!dbProduct) throw new Error(`Product not found: ${item.productId}`);

      let serverPrice = dbProduct.price;
      // If a variantId was sent, use the variant's price instead
      if (item.variantId && dbProduct.variants?.length) {
        const variant = dbProduct.variants.find(
          (v: any) => v._id?.toString() === item.variantId
        );
        if (variant?.price) serverPrice = variant.price;
      }

      return {
        product: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: serverPrice, // ← always use DB price
        title: item.title,
        image: item.image,
      };
    });

    // Recalculate total from server-verified prices
    const verifiedSubtotal = verifiedItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    const verifiedTotal = verifiedSubtotal + (orderData.shippingCost || 0);
    // ─────────────────────────────────────────────────────────────────────────

    const orderDoc = {
      customerName: orderData.customerName.trim(),
      customerEmail: orderData.customerEmail?.toLowerCase().trim(),
      items: verifiedItems,
      totalAmount: verifiedTotal,   // ← server-calculated, not client-supplied
      shippingCost: orderData.shippingCost,
      shippingZone: orderData.shippingZone,
      notes: orderData.notes,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    };

    const order = await Order.create(orderDoc);

    // Background tasks (Invoice, Email, Telegram)
    // MUST await in serverless environments, otherwise the process is killed before they finish
    const notificationPayload = {
      orderId: order._id.toString(),
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail || '',
      totalAmount: verifiedTotal,
      shippingCost: orderData.shippingCost,
      shippingZone: orderData.shippingZone,
      notes: orderData.notes,
      paymentMethod: orderData.paymentMethod,
      shippingAddress: orderData.shippingAddress,
      items: verifiedItems.map(item => ({
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
          items: verifiedItems.map(i => ({ title: i.title, quantity: i.quantity, price: i.price })),
          shippingCost: orderData.shippingCost,
          totalAmount: verifiedTotal,
          fulfillmentStatus: 'unfulfilled',
        })
      ),
    ]).catch(err => console.error('Background tasks error:', err));

    // Inventory Bulk Write (use verifiedItems which has correct product references)
    const inventoryOps = verifiedItems.map(item => {
      if (item.variantId) {
        return {
          updateOne: {
            filter: { _id: item.product, 'variants._id': item.variantId },
            update: { $inc: { 'variants.$.stock': -item.quantity } },
          },
        };
      } else {
        return {
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { inventory: -item.quantity } },
          },
        };
      }
    });

    if (inventoryOps.length > 0) {
      await Product.bulkWrite(inventoryOps).catch((err: any) =>
        console.error('Failed to update inventory via bulkWrite:', err)
      );
    }

    return NextResponse.json({ 
      data: { orderId: order._id, message: 'Order created successfully' },
      error: null
    });
  } catch (err: any) {
    console.error('Order Creation error:', err);
    return NextResponse.json(
      { data: null, error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
