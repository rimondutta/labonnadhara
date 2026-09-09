import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';

export async function POST(req: Request) {
  try {
    const { code, orderTotal } = await req.json();

    if (!code || orderTotal === undefined) {
      return NextResponse.json({ error: 'Code and orderTotal are required' }, { status: 400 });
    }

    await connectToDatabase();

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Invalid or inactive coupon code' }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, message: 'Coupon has expired' }, { status: 400 });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ valid: false, message: 'Coupon usage limit reached' }, { status: 400 });
    }

    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return NextResponse.json({ valid: false, message: `Minimum order amount is ৳${coupon.minOrderAmount}` }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    return NextResponse.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  } catch (error: any) {
    console.error('Coupon validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
