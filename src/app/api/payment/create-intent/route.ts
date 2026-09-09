import { NextResponse } from 'next/server';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────────────
// POST /api/payment/create-intent
// Creates a Stripe PaymentIntent for the mobile checkout flow.
// Auth: Bearer JWT optional (guests can checkout too)
// Body: { cartItems: CartItem[], shippingAddress: { ... } }
// Response: { clientSecret: string }
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartItems, shippingAddress } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cart is empty' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Calculate total in cents (Stripe uses smallest currency unit)
    const subtotal = cartItems.reduce(
      (sum: number, item: any) => sum + item.product.price * item.quantity,
      0
    );
    const shipping = 10.0;
    const tax = subtotal * 0.08;
    const totalCents = Math.round((subtotal + shipping + tax) * 100);

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('[payment/create-intent] STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'Payment not configured' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Dynamic import to avoid Turbopack issues
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-07-29.dahlia' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        itemCount: cartItems.length.toString(),
        shippingCity: shippingAddress?.city ?? '',
      },
    });

    return NextResponse.json(
      { success: true, clientSecret: paymentIntent.client_secret },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[POST /api/payment/create-intent]', error);
    return NextResponse.json(
      { success: false, error: error.message ?? 'Payment failed' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
