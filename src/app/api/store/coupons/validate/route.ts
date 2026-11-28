import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { hasUnsafeObjectKeys } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

const couponValidateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Coupon code is required')
      .max(40, 'Invalid coupon code')
      .regex(/^[A-Za-z0-9_-]+$/, 'Invalid coupon code characters'),
    orderTotal: z.number().finite().min(0, 'Order total must be non-negative').max(100_000_000),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'global');
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

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ error: 'Invalid coupon request' }, { status: 400 });
    }

    const bodyObj = rawBody as Record<string, unknown>;
    const candidate = {
      code: bodyObj.code,
      orderTotal:
        typeof bodyObj.orderTotal === 'string' ? Number(bodyObj.orderTotal) : bodyObj.orderTotal,
    };

    const parsed = couponValidateSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Code and orderTotal are required' },
        { status: 400 }
      );
    }

    const { code, orderTotal } = parsed.data;

    await connectToDatabase();

    const coupon = (await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).lean()) as {
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      minOrderAmount?: number;
      maxUses?: number;
      usedCount?: number;
      expiresAt?: Date | string | null;
    } | null;

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Invalid or inactive coupon code' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, message: 'Coupon has expired' }, { status: 400 });
    }

    if (coupon.maxUses && (coupon.usedCount ?? 0) >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: 'Coupon usage limit reached' }, { status: 400 });
    }

    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { valid: false, message: `Minimum order amount is ৳${coupon.minOrderAmount}` },
        { status: 400 }
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.min(orderTotal, (orderTotal * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.min(orderTotal, coupon.discountValue);
    }

    return NextResponse.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  } catch (error: unknown) {
    console.error('Coupon validation error:', getSafeErrorMessage(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
