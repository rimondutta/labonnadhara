import { NextResponse } from 'next/server';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─────────────────────────────────────────────────────────────
// PUT /api/users/addresses/[addressId] — update a specific address
// DELETE /api/users/addresses/[addressId] — delete a specific address
// Auth: Bearer JWT required
// ─────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: Promise<{ addressId: string }> }) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { addressId } = await params;
    const body = await req.json();

    await connectToDatabase();

    const updateFields: Record<string, any> = {};
    for (const [key, val] of Object.entries(body)) {
      updateFields[`addresses.$.${key}`] = val;
    }

    const user = await User.findOneAndUpdate(
      { _id: session.user.id, 'addresses._id': addressId },
      { $set: updateFields },
      { new: true }
    ).select('addresses').lean() as any;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { success: true, data: user.addresses, addresses: user.addresses },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[PUT /api/users/addresses/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ addressId: string }> }) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const { addressId } = await params;
    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    ).select('addresses').lean() as any;

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { success: true, data: user.addresses, addresses: user.addresses },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[DELETE /api/users/addresses/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
