import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { mobileCorsHeaders } from '@/lib/cors';
import {
  isValidObjectId,
  requireAuthenticatedUser,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { addressPatchSchema, hasUnsafeObjectKeys } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const { addressId } = await params;
    if (!isValidObjectId(addressId)) {
      return NextResponse.json({ success: false, error: 'Invalid address ID' }, { status: 400, headers });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ success: false, error: 'Invalid address update payload' }, { status: 400, headers });
    }

    const parsed = addressPatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid address fields' },
        { status: 400, headers }
      );
    }

    const entries = Object.entries(parsed.data).filter(([, v]) => v !== undefined);
    if (entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updatable fields provided' },
        { status: 400, headers }
      );
    }

    await connectToDatabase();

    if (parsed.data.isDefault === true) {
      await User.updateOne(
        { _id: auth.session.user.id },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    // Explicitly construct allowlisted subdocument $set paths
    const updateFields: Record<string, string | boolean> = {};
    for (const [key, val] of entries) {
      if (val !== undefined) {
        updateFields[`addresses.$.${key}`] = val as string | boolean;
      }
    }

    const user = (await User.findOneAndUpdate(
      { _id: auth.session.user.id, 'addresses._id': addressId },
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    )
      .select('addresses')
      .lean()) as { addresses?: unknown[] } | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404, headers });
    }

    return NextResponse.json(
      { success: true, data: user.addresses ?? [], addresses: user.addresses ?? [] },
      { headers }
    );
  } catch (error: unknown) {
    console.error('[PUT /api/users/addresses/[addressId]]', getSafeErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const { addressId } = await params;
    if (!isValidObjectId(addressId)) {
      return NextResponse.json({ success: false, error: 'Invalid address ID' }, { status: 400, headers });
    }

    await connectToDatabase();

    const user = (await User.findOneAndUpdate(
      { _id: auth.session.user.id, 'addresses._id': addressId },
      { $pull: { addresses: { _id: addressId } } },
      { returnDocument: 'after' }
    )
      .select('addresses')
      .lean()) as { addresses?: unknown[] } | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'Address not found' }, { status: 404, headers });
    }

    return NextResponse.json(
      { success: true, data: user.addresses ?? [], addresses: user.addresses ?? [] },
      { headers }
    );
  } catch (error: unknown) {
    console.error('[DELETE /api/users/addresses/[addressId]]', getSafeErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers });
  }
}
