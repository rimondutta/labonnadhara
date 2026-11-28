import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { mobileCorsHeaders } from '@/lib/cors';
import { requireAuthenticatedUser, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { addressCreateSchema, hasUnsafeObjectKeys } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}

export async function GET(req: NextRequest) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    await connectToDatabase();
    const user = (await User.findById(auth.session.user.id).select('addresses').lean()) as {
      addresses?: unknown[];
    } | null;

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers });
    }

    return NextResponse.json(
      { success: true, data: user.addresses ?? [], addresses: user.addresses ?? [] },
      { headers }
    );
  } catch (error: unknown) {
    console.error('[GET /api/users/addresses]', getSafeErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers });
  }
}

export async function POST(req: NextRequest) {
  const headers = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers }
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ success: false, error: 'Invalid address payload' }, { status: 400, headers });
    }

    const parsed = addressCreateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid address fields' },
        { status: 400, headers }
      );
    }

    await connectToDatabase();

    if (parsed.data.isDefault) {
      await User.updateOne(
        { _id: auth.session.user.id },
        { $set: { 'addresses.$[].isDefault': false } }
      );
    }

    const newAddress = {
      label: parsed.data.label,
      fullName: parsed.data.fullName,
      streetAddress: parsed.data.streetAddress,
      city: parsed.data.city,
      state: parsed.data.state,
      zipCode: parsed.data.zipCode,
      phoneNumber: parsed.data.phoneNumber,
      isDefault: parsed.data.isDefault,
    };

    const user = (await User.findByIdAndUpdate(
      auth.session.user.id,
      { $push: { addresses: newAddress } },
      { returnDocument: 'after', runValidators: true }
    )
      .select('addresses')
      .lean()) as { addresses?: unknown[] } | null;

    return NextResponse.json(
      { success: true, data: user?.addresses ?? [], addresses: user?.addresses ?? [] },
      { status: 201, headers }
    );
  } catch (error: unknown) {
    console.error('[POST /api/users/addresses]', getSafeErrorMessage(error));
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers });
  }
}
