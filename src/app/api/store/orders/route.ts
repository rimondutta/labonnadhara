import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { isRateLimited } from '@/lib/ratelimit';
import { redis, hasRedis } from '@/lib/redis';

// Idempotency window: 10 minutes.
// Any duplicate POST with the same key within this window returns the cached orderId.
const IDEMPOTENCY_TTL_SECONDS = 600;

/**
 * Atomically claim an idempotency key in Redis using SET NX EX.
 * Returns:
 *   - { claimed: true }           — first time this key is seen; proceed to create order
 *   - { claimed: false, orderId } — already seen; return the cached orderId
 *   - null                        — Redis unavailable; fall through (fail-open)
 */
async function claimIdempotencyKey(key: string): Promise<{ claimed: true } | { claimed: false; orderId: string } | null> {
  if (!hasRedis || !redis) return null;
  try {
    // SET key "pending" NX EX <ttl> — only sets if key does not exist
    const result = await redis.set(`idempotency:order:${key}`, 'pending', {
      nx: true,
      ex: IDEMPOTENCY_TTL_SECONDS,
    });
    if (result === 'OK') {
      // We own the key — first submission
      return { claimed: true };
    }
    // Key already exists — this is a duplicate.  Retrieve the stored orderId.
    const stored = await redis.get<string>(`idempotency:order:${key}`);
    if (stored && stored !== 'pending') {
      return { claimed: false, orderId: stored };
    }
    // Edge case: key exists but is still 'pending' (race / very fast retry).
    // Treat as duplicate; caller will surface the in-progress state.
    return { claimed: false, orderId: '' };
  } catch (err) {
    console.error('[idempotency] Redis error, falling through:', err);
    return null; // fail-open
  }
}

/**
 * Persist the confirmed orderId against the idempotency key so subsequent
 * retries can receive the real orderId instead of 'pending'.
 */
async function resolveIdempotencyKey(key: string, orderId: string): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    // GETSET so the TTL remains (use SET with keepttl if supported, fallback to SET + EX)
    await redis.set(`idempotency:order:${key}`, orderId, { ex: IDEMPOTENCY_TTL_SECONDS });
  } catch (err) {
    console.error('[idempotency] Failed to resolve key:', err);
  }
}

export async function POST(req: Request) {
  try {
    // ── Distributed Rate Limiting ──
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

    const rateLimited = await isRateLimited(ip);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      customerEmail, customerName, items, totalAmount,
      shippingAddress, paymentMethod, shippingCost, shippingZone, notes,
      idempotencyKey,
    } = body;

    if (!items || items.length === 0 || !totalAmount) {
      return NextResponse.json({ error: 'Missing required order details' }, { status: 400 });
    }

    // Basic email format validation if email is provided
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }
    }

    // ── Idempotency Check ──
    // If the client sent a key, atomically claim it in Redis.
    // A duplicate POST (retry, double-click, network replay) with the same key
    // returns the already-created orderId — no new order is created.
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const idempotencyResult = await claimIdempotencyKey(idempotencyKey);

      if (idempotencyResult !== null && !idempotencyResult.claimed) {
        const cachedOrderId = (idempotencyResult as { claimed: false; orderId: string }).orderId;
        if (cachedOrderId) {
          // Duplicate submission — order already exists.
          // Retry the CAPI Purchase event using the SAME event_id (cachedOrderId).
          // If the original CAPI call succeeded, Meta deduplicates via event_id — no double count.
          // If the original CAPI call failed, this retry delivers it without creating a new order.
          // The browser Pixel also fires with this same orderId as eventID → one logical Purchase.
          try {
            const cookieStore = await cookies();
            const fbp = cookieStore.get('_fbp')?.value;
            const fbc = cookieStore.get('_fbc')?.value;
            const { sendCapiEvent } = await import('@/lib/capi');
            const capiResult = await sendCapiEvent({
              eventName: 'Purchase',
              eventTime: Math.floor(Date.now() / 1000),
              eventId: cachedOrderId,
              actionSource: 'website',
              eventSourceUrl: req.headers.get('referer') || '',
              userData: {
                em: customerEmail,
                ph: shippingAddress?.phone,
                client_ip_address: ip,
                client_user_agent: req.headers.get('user-agent') || undefined,
                fbp,
                fbc,
                external_id: customerEmail || shippingAddress?.phone || undefined,
              },
              customData: {
                value: totalAmount,
                currency: 'BDT',
                order_id: cachedOrderId,
                content_ids: (items || []).map((i: any) => i.productId).filter(Boolean),
                content_type: 'product',
                num_items: (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
              },
            });
            if (!capiResult.success) {
              console.error('[CAPI Purchase retry] Meta rejected the event:', capiResult.error);
            }
          } catch (capiErr) {
            console.error('[CAPI Purchase retry] Failed to send Meta Conversions API event:', capiErr);
          }

          return NextResponse.json({
            success: true,
            orderId: cachedOrderId,
            message: 'Order already exists',
            deduplicated: true,
          });
        }
        // 'pending' edge case: order is in-flight from another request. Return 409.
        return NextResponse.json(
          { error: 'Order is already being processed. Please wait a moment.' },
          { status: 409 }
        );
      }
      // If idempotencyResult is null (Redis unavailable), fall through to create normally.
    }

    await connectToDatabase();

    // Map client items to schema fields (productId → product, keep image)
    const mappedItems = (items || []).map((item: any) => ({
      product: item.productId || item.product,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price,
      title: item.title,
      image: item.image || null,
      variantOptions: item.variantOptions,
    }));

    // Create the order
    const orderData: any = {
      customerName: String(customerName || '').trim(),
      items: mappedItems,
      totalAmount,
      shippingCost: shippingCost || 0,
      shippingZone,
      notes,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
    };
    if (customerEmail) {
      orderData.customerEmail = String(customerEmail).toLowerCase().trim();
    }
    const order = await Order.create(orderData);

    // ── Resolve the idempotency key with the real orderId ──
    // Any subsequent duplicate requests now receive this orderId and skip order creation.
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      await resolveIdempotencyKey(idempotencyKey, order._id.toString());
    }

    // Performance: Replace N sequential inventory writes with a single bulkWrite.
    const inventoryOps = items
      .filter((item: any) => item.productId)
      .map((item: any) => {
        if (item.variantId) {
          return {
            updateOne: {
              filter: { _id: item.productId, 'variants._id': item.variantId },
              update: { $inc: { 'variants.$.stock': -item.quantity } },
            },
          };
        } else {
          return {
            updateOne: {
              filter: { _id: item.productId },
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

    // ── Background Tasks (Invoice, Email, Telegram, Google Sheets) ──
    const notificationPayload = {
      orderId: order._id.toString(),
      customerName,
      customerEmail,
      totalAmount,
      items,
      shippingAddress,
      paymentMethod: paymentMethod || 'cod',
      shippingCost: shippingCost || 0,
    };

    const cookieStore = await cookies();
    const fbp = cookieStore.get('_fbp')?.value;
    const fbc = cookieStore.get('_fbc')?.value;

    // ── Non-CAPI Background Tasks ──
    await Promise.allSettled([
      import('@/lib/invoice/generateInvoicePdf').then(({ generateInvoiceForOrder }) => generateInvoiceForOrder(order._id.toString())),
      customerEmail ? import('@/lib/nodemailer').then(({ sendOrderConfirmationEmail }) => sendOrderConfirmationEmail(notificationPayload)) : Promise.resolve(),
      import('@/lib/telegram').then(({ sendTelegramNotification }) => sendTelegramNotification(notificationPayload)),
      import('@/lib/googleSheets').then(({ appendOrderToSheet }) =>
        appendOrderToSheet({
          orderId: order._id.toString(),
          customerName,
          customerEmail,
          phone: shippingAddress?.phone,
          addressLine1: shippingAddress?.addressLine1,
          city: shippingAddress?.city,
          paymentMethod: paymentMethod || 'cod',
          items: (items || []).map((i: any) => ({ title: i.title || '', quantity: i.quantity || 1, price: i.price || 0 })),
          shippingCost: shippingCost || 0,
          totalAmount,
          fulfillmentStatus: 'unfulfilled',
        })
      ),
    ]);

    // ── Meta Conversions API — Purchase ──
    // Awaited separately so failures are always explicitly logged.
    // event_id = orderId matches the browser Pixel's eventID for deduplication.
    // If CAPI fails here, no new order is created on retry — the idempotency
    // key returns the same orderId, so the same event_id is reused automatically.
    try {
      const { sendCapiEvent } = await import('@/lib/capi');
      const capiResult = await sendCapiEvent({
        eventName: 'Purchase',
        eventTime: Math.floor(Date.now() / 1000),
        eventId: order._id.toString(),
        actionSource: 'website',
        eventSourceUrl: req.headers.get('referer') || '',
        userData: {
          em: customerEmail,
          ph: shippingAddress?.phone,
          client_ip_address: ip,
          client_user_agent: req.headers.get('user-agent') || undefined,
          fbp,
          fbc,
          external_id: customerEmail || shippingAddress?.phone || undefined,
        },
        customData: {
          value: totalAmount,
          currency: 'BDT',
          order_id: order._id.toString(),
          content_ids: (items || []).map((i: any) => i.productId).filter(Boolean),
          content_type: 'product',
          num_items: (items || []).reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
        },
      });
      if (!capiResult.success) {
        console.error('[CAPI Purchase] Meta rejected the event:', capiResult.error);
      }
    } catch (capiErr) {
      console.error('[CAPI Purchase] Failed to send Meta Conversions API event:', capiErr);
    }

    return NextResponse.json({
      success: true,
      orderId: order._id,
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('Order Creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 }
    );
  }
}
