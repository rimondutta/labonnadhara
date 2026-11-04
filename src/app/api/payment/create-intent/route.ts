import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { calculateOrderTotals } from '@/lib/order-pricing';
import { mobileCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-intent
// Creates a Stripe PaymentIntent with authoritative server-side pricing.
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment.' },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const body = await req.json();
    const { cartItems, shippingAddress, email, couponCode, shippingZone } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();

    // ── Authoritative DB Pricing Lookup via calculateOrderTotals ──
    let pricingResult;
    try {
      pricingResult = await calculateOrderTotals({
        items: cartItems.map((item: { productId?: string; product?: { _id?: string } | string; variantId?: string; quantity: number }) => ({
          productId: String(item.productId || (typeof item.product === 'object' ? item.product?._id : item.product) || '').trim(),
          variantId: item.variantId ? String(item.variantId).trim() : undefined,
          quantity: item.quantity,
        })),
        couponCode: couponCode || null,
        shippingZone: shippingZone || 'outside_chattogram',
        checkStock: true,
      });
    } catch (pricingErr: unknown) {
      return NextResponse.json(
        { success: false, error: (pricingErr as Error).message || 'Invalid cart items or stock unavailable' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const totalAmount = pricingResult.totalAmount;
    // Smallest currency unit (cents/poisha). Avoid floating-point errors.
    const totalCents = Math.round(totalAmount * 100);

    // Minimum charge check for Stripe (50 cents)
    if (totalCents < 50) {
      return NextResponse.json(
        { success: false, error: 'Total amount is below minimum processing threshold' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[payment/create-intent] STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Payment service not configured' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'bdt',
      payment_method_types: ['card'],
      receipt_email: email || undefined,
      metadata: {
        customerEmail: email || 'guest',
        itemCount: pricingResult.verifiedItems.length.toString(),
        subtotal: pricingResult.subtotal.toString(),
        shippingCost: pricingResult.shippingCost.toString(),
        shippingCity: (shippingAddress as Record<string, string>)?.city || 'N/A',
      },
    });

    return NextResponse.json(
      {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        currency: 'bdt',
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error creating PaymentIntent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize payment' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}
