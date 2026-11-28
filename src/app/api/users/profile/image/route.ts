import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import { mobileCorsHeaders } from '@/lib/cors';
import { requireAuthenticatedUser, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import {
  MAX_AVATAR_SIZE_BYTES,
  isRequestContentLengthOverLimit,
  validateBase64ImageDataUrl,
} from '@/lib/upload-security';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  const responseHeaders = { ...CORS_HEADERS, ...PRIVATE_NO_STORE_HEADERS };

  try {
    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: auth.errorResponse.status, headers: responseHeaders }
      );
    }

    const rateLimit = await checkRateLimit(getClientIp(req), 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429, headers: responseHeaders }
      );
    }

    // Reject oversized request bodies before JSON parsing into memory (2 MB image -> ~2.75 MB base64)
    if (isRequestContentLengthOverLimit(req, Math.ceil((MAX_AVATAR_SIZE_BYTES * 4) / 3) + 4096)) {
      return NextResponse.json(
        { success: false, error: 'Profile image exceeds the 2 MB limit' },
        { status: 413, headers: responseHeaders }
      );
    }

    const body = await req.json().catch(() => null);
    const imageBase64 = body && typeof body === 'object' ? (body as { imageBase64?: unknown }).imageBase64 : null;

    const validation = validateBase64ImageDataUrl(imageBase64, MAX_AVATAR_SIZE_BYTES);
    if (!validation.valid || !validation.normalizedDataUrl) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid profile image format' },
        { status: 400, headers: responseHeaders }
      );
    }

    await connectToDatabase();

    const user = await User.findById(auth.session.user.id);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: responseHeaders }
      );
    }

    if (user.image && typeof user.image === 'string' && user.image.includes('cloudinary.com')) {
      try {
        await deleteImage(user.image);
      } catch (err) {
        console.warn('Old profile image delete warning:', getSafeErrorMessage(err));
      }
    }

    const secureUrl = await uploadImage(validation.normalizedDataUrl, 'users');

    user.image = secureUrl;
    await user.save();

    return NextResponse.json(
      { success: true, imageUrl: secureUrl },
      { headers: responseHeaders }
    );
  } catch (error: unknown) {
    console.error('[POST /api/users/profile/image]', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: responseHeaders }
    );
  }
}
