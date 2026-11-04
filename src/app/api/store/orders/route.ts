import { NextResponse } from 'next/server';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Coupon from '@/models/Coupon';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { redis, hasRedis } from '@/lib/redis';
import { calculateOrderTotals } from '@/lib/order-pricing';

// Idempotency window: 10 minutes.
const IDEMPOTENCY_TTL_SECONDS = 600;

async function claimIdempotencyKey(key: string): Promise<{ claimed: true } | { claimed: false; orderId: string } | null> {
  if (!hasRedis || !redis) return null;
  try {
    const result = await redis.set(`idempotency:order:${key}`, 'pending', {
      nx: true,
      ex: IDEMPOTENCY_TTL_SECONDS,
    });
    if (result === 'OK') {
      return { claimed: true };
    }
    const stored = await redis.get<string>(`idempotency:order:${key}`);
    if (stored && stored !== 'pending') {
      return { claimed: false, orderId: stored };
    }
    return { claimed: false, orderId: '' };
  } catch (err) {
    console.error('[idempotency] Redis error, falling through:', err);
    return null;
  }
}

async function resolveIdempotencyKey(key: string, orderId: string): Promise<void> {
  if (!hasRedis || !redis) return;
  try {
    await redis.set(`idempotency:order:${key}`, orderId, { ex: IDEMPOTENCY_TTL_SECONDS });
  } catch (err) {
    console.error('[idempotency] Failed to resolve key:', err);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Distributed Rate Limiting — now with Retry-After header
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const body = await req.json();
    const {
      customerEmail,
      customerName,
      items,
      shippingAddress,
      paymentMethod,
      shippingZone,
      notes,
      idempotencyKey,
      couponCode,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must include at least one item.' }, { status: 400 });
    }

    if (!customerName || typeof customerName !== 'string' || customerName.trim() === '') {
      return NextResponse.json({ error: 'Customer name is required.' }, { status: 400 });
    }

    if (!shippingAddress || !shippingAddress.addressLine1 || !shippingAddress.city || !shippingAddress.phone) {
      return NextResponse.json(
        { error: 'Valid shipping address (address line, city, and phone number) is required.' },
        { status: 400 }
      );
    }

    // Basic email format validation if email is provided
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(customerEmail).trim())) {
        return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
      }
    }

    // 2. Idempotency Check
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const idempotencyResult = await claimIdempotencyKey(idempotencyKey);

      if (idempotencyResult !== null && !idempotencyResult.claimed) {
        const cachedOrderId = (idempotencyResult as { claimed: false; orderId: string }).orderId;
        if (cachedOrderId) {
          return NextResponse.json({
            success: true,
            orderId: cachedOrderId,
            message: 'Order already exists',
            deduplicated: true,
          });
        }
        return NextResponse.json(
          { error: 'Order is already being processed. Please wait a moment.' },
          { status: 409 }
        );
      }
    }

    await connectToDatabase();

    // 3. Authoritative Server-Side Pricing & Inventory Validation
    let pricingResult;
    try {
      pricingResult = await calculateOrderTotals({
        items,
        couponCode,
        shippingZone,
        checkStock: true,
      });
    } catch (pricingError: unknown) {
      return NextResponse.json(
        { error: (pricingError as Error).message || 'Invalid order data.' },
        { status: 400 }
      );
    }

    const {
      verifiedItems,
      shippingCost,
      totalAmount,
      appliedCoupon,
      inventoryOperations,
    } = pricingResult;

    // 4. Cryptographic Guest Invoice Token (HMAC / Random Token)
    const guestAccessToken = crypto.randomBytes(32).toString('hex');
    const guestAccessTokenHash = crypto.createHash('sha256').update(guestAccessToken).digest('hex');

    // 5. Create Order with authoritative prices and totals
    const isInside = shippingZone === 'inside_chattogram';
    const orderData: Record<string, unknown> = {
      customerName: String(customerName).trim(),
      items: verifiedItems,
      totalAmount, // Calculated authoritative total from DB
      shippingCost, // Calculated authoritative shipping
      shippingZone: isInside ? 'inside_chattogram' : 'outside_chattogram',
      notes: notes ? String(notes).slice(0, 500) : undefined,
      shippingAddress: {
        addressLine1: String(shippingAddress.addressLine1).trim(),
        city: String(shippingAddress.city).trim(),
        postcode: shippingAddress.postcode ? String(shippingAddress.postcode).trim() : '',
        country: shippingAddress.country ? String(shippingAddress.country).trim() : 'Bangladesh',
        phone: String(shippingAddress.phone).trim(),
      },
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      guestAccessTokenHash,
    };

    if (customerEmail) {
      orderData.customerEmail = String(customerEmail).toLowerCase().trim();
    }

    const order = await Order.create(orderData);

    // Atomically deduct inventory
    if (inventoryOperations.length > 0) {
      try {
        await Product.bulkWrite(inventoryOperations, { ordered: false });
      } catch (stockErr) {
        console.error('[Inventory] Bulk stock deduction failed:', stockErr);
      }
    }

    // Atomically increment coupon usage
    if (appliedCoupon) {
      await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: 1 } }).catch((err) =>
        console.error('[Coupon] Failed to increment usage count:', err)
      );
    }

    // Resolve Idempotency key
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      await resolveIdempotencyKey(idempotencyKey, order._id.toString());
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order._id,
        invoiceNumber: order.invoiceNumber,
        guestAccessToken, // Returned so checkout can securely redirect to /invoice/[id]?token=...
        message: 'Order created successfully',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Failed to create order:', error);
    return NextResponse.json(
      { error: 'Failed to place order.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
