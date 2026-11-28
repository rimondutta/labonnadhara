import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Coupon from '@/models/Coupon';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, isValidObjectId, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { buildCouponCreatePayload, buildCouponPatchPayload } from '@/lib/validation/schemas';

// GET all coupons
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(coupons, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET coupons error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

// POST create a new coupon (allowlisted Zod fields only)
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = buildCouponCreatePayload(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const existing = await Coupon.findOne({ code: parsed.data.code }).select('_id').lean();
    if (existing) {
      return NextResponse.json(
        { error: 'Coupon code already exists' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const coupon = await Coupon.create({
      code: parsed.data.code,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue,
      minOrderAmount: parsed.data.minOrderAmount,
      maxUses: parsed.data.maxUses,
      isActive: parsed.data.isActive,
      expiresAt: parsed.data.expiresAt,
      usedCount: 0,
    });

    return NextResponse.json(coupon, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin POST coupon error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

// DELETE a coupon
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Valid coupon ID is required' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ success: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin DELETE coupon error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

// PATCH update a coupon (explicit $set allowlisted fields only; usedCount protected)
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = buildCouponPatchPayload(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (Object.keys(parsed.updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updatable coupon fields provided' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();
    const coupon = await Coupon.findByIdAndUpdate(
      parsed.id,
      { $set: parsed.updates },
      { returnDocument: 'after', runValidators: true }
    );

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(coupon, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin PATCH coupon error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
