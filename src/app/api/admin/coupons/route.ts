import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import Coupon from "@/models/Coupon";

// Auth helper — reusable guard for all handlers
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
    return null;
  }
  return session;
}

// GET all coupons
export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(coupons);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new coupon
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await req.json();

    // Check if code already exists
    const existing = await Coupon.findOne({ code: body.code?.toUpperCase() });
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }

    const coupon = await Coupon.create({
      code: body.code,
      discountType: body.discountType || "percentage",
      discountValue: body.discountValue,
      minOrderAmount: body.minOrderAmount || 0,
      maxUses: body.maxUses || 0,
      isActive: body.isActive !== false,
      expiresAt: body.expiresAt || null,
    });

    return NextResponse.json(coupon, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a coupon
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await Coupon.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH update a coupon
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectToDatabase();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const coupon = await Coupon.findByIdAndUpdate(id, updates, { new: true });
    if (!coupon) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

    return NextResponse.json(coupon);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
