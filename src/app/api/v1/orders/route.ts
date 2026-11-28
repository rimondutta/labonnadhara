import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Coupon from '@/models/Coupon';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { calculateOrderTotals } from '@/lib/order-pricing';
import {
  InsufficientStockError,
  InventoryUpdateOp,
  releaseOrderInventory,
  reserveOrderInventory,
} from '@/lib/inventory';
import { hasUnsafeObjectKeys } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  title: z.string().min(1).optional(),
  image: z.string().optional(),
});

const OrderSchema = z
  .object({
    customerName: z.string().trim().min(1, 'Name is required').max(120),
    customerEmail: z.string().trim().email('Invalid email address').max(160).optional(),
    items: z.array(OrderItemSchema).min(1, 'At least one item is required').max(100),
    totalAmount: z.number().min(0).optional(),
    shippingCost: z.number().min(0).default(0),
    shippingZone: z.string().max(40).optional(),
    notes: z.string().max(500).optional(),
    paymentMethod: z.enum(['cod', 'bkash', 'card']).default('cod'),
    couponCode: z.string().max(40).optional(),
    shippingAddress: z.object({
      addressLine1: z.string().trim().min(1, 'Address is required').max(300),
      city: z.string().trim().min(1, 'City is required').max(100),
      postcode: z.string().trim().max(30).default(''),
      country: z.string().trim().max(80).default('Bangladesh'),
      phone: z.string().trim().min(1, 'Phone is required').max(30),
    }),
  })
  .strict();

function isReplicaSetUnsupportedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  return (
    msg.includes('transaction numbers are only allowed on a replica set member') ||
    msg.includes('sessions are not supported')
  );
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { data: null, error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ data: null, error: 'Invalid order payload.' }, { status: 400 });
    }

    const parsed = OrderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const orderData = parsed.data;

    await connectToDatabase();

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

    const { verifiedItems, totalAmount, shippingCost, appliedCoupon, inventoryOperations } = pricingResult;

    const guestAccessToken = crypto.randomBytes(32).toString('hex');
    const guestAccessTokenHash = crypto.createHash('sha256').update(guestAccessToken).digest('hex');

    const isInside = orderData.shippingZone === 'inside_chattogram';
    const orderDoc = {
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail?.toLowerCase(),
      items: verifiedItems,
      totalAmount,
      shippingCost,
      shippingZone: isInside ? 'inside_chattogram' : 'outside_chattogram',
      notes: orderData.notes,
      shippingAddress: orderData.shippingAddress,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      guestAccessTokenHash,
    };

    const executeOrderWrite = async (session?: mongoose.ClientSession) => {
      let reservedOps: InventoryUpdateOp[] = [];
      try {
        reservedOps = await reserveOrderInventory(inventoryOperations, session);

        if (appliedCoupon) {
          const couponUpdate = await Coupon.updateOne(
            {
              _id: appliedCoupon._id,
              isActive: true,
              $or: [
                { maxUses: { $lte: 0 } },
                { maxUses: null },
                { $expr: { $lt: ['$usedCount', '$maxUses'] } },
              ],
            },
            { $inc: { usedCount: 1 } },
            session ? { session } : undefined
          );
          if (!couponUpdate || couponUpdate.modifiedCount !== 1) {
            throw new InsufficientStockError('Coupon usage limit reached.');
          }
        }

        const created = session
          ? (await Order.create([orderDoc], { session }))[0]
          : await Order.create(orderDoc);
        return created;
      } catch (err) {
        if (!session && reservedOps.length > 0) {
          await releaseOrderInventory(reservedOps).catch((rbErr) => {
            console.error('[v1/orders] Failed fallback rollback:', rbErr);
          });
        }
        throw err;
      }
    };

    let order;
    const mongoSession = await mongoose.startSession();
    try {
      let txOrder: InstanceType<typeof Order> | null = null;
      await mongoSession.withTransaction(async () => {
        txOrder = await executeOrderWrite(mongoSession);
      });
      order = txOrder;
    } catch (txErr: unknown) {
      if (isReplicaSetUnsupportedError(txErr)) {
        order = await executeOrderWrite();
      } else if (txErr instanceof InsufficientStockError) {
        return NextResponse.json({ data: null, error: txErr.message }, { status: 409 });
      } else {
        throw txErr;
      }
    } finally {
      await mongoSession.endSession();
    }

    if (!order) {
      return NextResponse.json({ data: null, error: 'Failed to create order.' }, { status: 500 });
    }

    const cookieStore = await cookies();
    const fbp = cookieStore.get('_fbp')?.value;
    const fbc = cookieStore.get('_fbc')?.value;
    const userAgent = req.headers.get('user-agent') || '';
    const orderId = order._id.toString();

    const notificationPayload = {
      orderId,
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

    // P-11: Dispatch slow external I/O cleanly via Next.js after() without blocking HTTP 201
    after(async () => {
      await Promise.allSettled([
        import('@/lib/invoice/generateInvoicePdf').then(({ generateInvoiceForOrder }) =>
          generateInvoiceForOrder(orderId)
        ),
        orderData.customerEmail
          ? import('@/lib/nodemailer').then(({ sendOrderConfirmationEmail }) =>
              sendOrderConfirmationEmail(notificationPayload)
            )
          : Promise.resolve(),
        import('@/lib/telegram').then(({ sendTelegramNotification }) =>
          sendTelegramNotification(notificationPayload)
        ),
        import('@/lib/googleSheets').then(({ appendOrderToSheet }) =>
          appendOrderToSheet({
            orderId,
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
        import('@/lib/capi').then(async ({ sendCapiEvent, hashData }) => {
          await sendCapiEvent({
            eventName: 'Purchase',
            eventTime: Math.floor(Date.now() / 1000),
            eventId: orderId,
            eventSourceUrl: 'https://labonnadhara.shop/checkout',
            actionSource: 'website',
            userData: {
              em: orderData.customerEmail ? hashData(orderData.customerEmail) : undefined,
              ph: orderData.shippingAddress.phone ? hashData(orderData.shippingAddress.phone) : undefined,
              fbp,
              fbc,
              client_ip_address: ip,
              client_user_agent: userAgent,
            },
            customData: {
              currency: 'BDT',
              value: totalAmount,
              order_id: orderId,
              num_items: verifiedItems.reduce((sum, i) => sum + i.quantity, 0),
              content_type: 'product',
              contents: verifiedItems.map((i) => ({
                id: i.product.toString(),
                quantity: i.quantity,
                item_price: i.price,
              })),
            },
          });
        }),
      ]);
    });

    return NextResponse.json(
      { data: { orderId, guestAccessToken }, error: null },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ data: null, error: error.message }, { status: 409 });
    }
    console.error('Order creation error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { data: null, error: 'Internal server error. Failed to create order.' },
      { status: 500 }
    );
  }
}
