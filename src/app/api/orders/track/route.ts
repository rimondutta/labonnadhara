import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Order from '@/models/Order';
import { getCourierTrackingUrl, getTrackingSteps } from '@/lib/courier';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';

function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

function maskPhone(phone?: string): string {
  if (!phone) return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

/** Normalizes a phone number to its core 10-digit national number */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function GET(req: Request) {
  try {
    // 1. IP-based rate limiting to prevent automated enumeration
    const ip = getClientIp(req);
    const { isLimited, reset } = await checkRateLimit(ip, 'global');
    if (isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many tracking attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = (searchParams.get('orderId') || searchParams.get('id') || searchParams.get('invoiceNumber') || '').trim();
    const phone = (searchParams.get('phone') || '').trim();

    // 2. Require BOTH Order ID and Phone Number
    if (!orderId || !phone) {
      return NextResponse.json(
        { success: false, error: 'Both Order ID / Invoice Number and Phone Number are required.' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 3. Build exact lookup query (No fuzzy or bulk scans)
    const orConditions: Array<Record<string, unknown>> = [
      { invoiceNumber: orderId },
      { invoiceNumber: orderId.toUpperCase() },
    ];

    if (mongoose.Types.ObjectId.isValid(orderId) && /^[0-9a-fA-F]{24}$/.test(orderId)) {
      orConditions.push({ _id: orderId });
    }

    const order = await Order.findOne({ $or: orConditions })
      .populate('items.product')
      .lean() as any;

    const normalizedSubmittedPhone = normalizePhone(phone);
    const orderPhone = normalizePhone(order?.shippingAddress?.phone || '');

    // 4. Return identical generic 404 whether order does not exist OR phone mismatches (Defense Against Enumeration)
    if (!order || !orderPhone || normalizedSubmittedPhone !== orderPhone) {
      return NextResponse.json(
        { success: false, error: 'Order not found. Please verify your Order ID and Phone Number.' },
        { status: 404 }
      );
    }

    // 5. Courier tracking link calculation
    let trackingUrl = order.courier?.trackingUrl;
    if (!trackingUrl && order.courier?.name && order.courier?.trackingId) {
      trackingUrl = getCourierTrackingUrl(order.courier.name, order.courier.trackingId);
    }

    // 6. Visual status steps
    const steps = getTrackingSteps(
      order.fulfillmentStatus,
      order.courierStatus,
      order.createdAt,
      order.updatedAt
    );

    // 7. Return only tracking-necessary fields, masking sensitive PII
    return NextResponse.json({
      success: true,
      data: {
        _id: order._id,
        invoiceNumber: order.invoiceNumber || `TH-${order._id.toString().slice(-6).toUpperCase()}`,
        customerName: order.customerName,
        customerEmail: maskEmail(order.customerEmail),
        shippingAddress: {
          city: order.shippingAddress?.city,
          postcode: order.shippingAddress?.postcode,
          addressLine1: order.shippingAddress?.addressLine1 ? '*** (Address hidden for privacy)' : undefined,
          phone: maskPhone(order.shippingAddress?.phone),
        },
        totalAmount: order.totalAmount,
        shippingCost: order.shippingCost,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        fulfillmentStatus: order.fulfillmentStatus,
        courierStatus: order.courierStatus || 'pending',
        courier: {
          name: order.courier?.name || 'Standard Courier',
          code: order.courier?.code || 'standard',
          trackingId: order.courier?.trackingId || null,
          trackingUrl: trackingUrl || null,
        },
        estimatedDeliveryDate: order.estimatedDeliveryDate || null,
        steps,
        timeline: order.trackingTimeline || [],
        items: (order.items || []).map((item: any) => ({
          productId: item.product?._id || item.product,
          title: item.title || item.product?.title || 'Product',
          quantity: item.quantity,
          price: item.price,
          image: item.product?.images?.[0] || item.product?.image || null,
        })),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
