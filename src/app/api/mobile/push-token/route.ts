/**
 * PATCH /api/mobile/push-token
 *
 * Registers (or refreshes) an Expo push token for the logged-in user.
 * Tokens are stored in expoPushTokens[] (deduped). Also backfills the
 * legacy pushToken field for backward compatibility.
 */
import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getBearerSession } from '@/lib/mobile-auth';
import { Expo } from 'expo-server-sdk';
import { mobileCorsHeaders } from '@/lib/cors';

export async function PATCH(req: NextRequest) {
  const CORS = mobileCorsHeaders(req);
  try {
    const session = await getBearerSession(req);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401, headers: CORS }
      );
    }

    const body = await req.json();
    const pushToken: string = (body.pushToken ?? body.token ?? '').trim();

    if (!pushToken) {
      return NextResponse.json(
        { success: false, error: 'pushToken is required.' },
        { status: 400, headers: CORS }
      );
    }

    if (!Expo.isExpoPushToken(pushToken)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Expo push token format.' },
        { status: 400, headers: CORS }
      );
    }

    await connectToDatabase();

    // Dedupe-add token to the array, also update legacy pushToken
    await User.updateOne(
      { _id: session.user.id },
      {
        $addToSet: { expoPushTokens: pushToken },
        $set: { pushToken },
      }
    );

    return NextResponse.json(
      { success: true, message: 'Push token registered.' },
      { headers: CORS }
    );
  } catch (err: unknown) {
    console.error('[push-token]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
