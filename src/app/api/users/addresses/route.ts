import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────────────
// GET /api/users/addresses — returns the user's saved addresses
// POST /api/users/addresses — add a new address
// Auth: Bearer JWT required
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select('addresses').lean() as any;
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { success: true, data: user.addresses ?? [], addresses: user.addresses ?? [] },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[GET /api/users/addresses]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const { label, fullName, streetAddress, city, state, zipCode, phoneNumber, isDefault } = body;

    if (!fullName || !streetAddress || !city) {
      return NextResponse.json({ success: false, error: 'Missing required address fields' }, { status: 400, headers: CORS_HEADERS });
    }

    await connectToDatabase();

    const newAddress = {
      _id: new mongoose.Types.ObjectId(),
      label: label ?? 'Home',
      fullName,
      streetAddress,
      city,
      state: state ?? '',
      zipCode: zipCode ?? '',
      phoneNumber: phoneNumber ?? '',
      isDefault: isDefault ?? false,
    };

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $push: { addresses: newAddress } },
      { new: true }
    ).select('addresses').lean() as any;

    return NextResponse.json(
      { success: true, data: user?.addresses ?? [], addresses: user?.addresses ?? [] },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[POST /api/users/addresses]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
