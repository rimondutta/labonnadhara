/**
 * POST /api/auth/verify-reset-otp
 * Verifies the 6-digit password reset OTP and issues a single-use short-lived reset token (10 min).
 */
import { NextResponse } from 'next/server';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret } from '@/lib/jwt-secret';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';
import { redis, hasRedis } from '@/lib/redis';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL_SECONDS = 600; // 10 minutes

export async function POST(req: Request) {
  const CORS = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            ...CORS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request payload.' }, { status: 400, headers: CORS });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const otp = typeof body.otp === 'string' || typeof body.otp === 'number' ? String(body.otp).trim() : '';

    if (!email || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code.' },
        { status: 400, headers: CORS }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email }).select(
      '+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpRequestedAt +resetTokenHash +resetTokenExpiresAt'
    );

    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code.' },
        { status: 400, headers: CORS }
      );
    }

    if ((user.resetOtpAttempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many failed attempts. Please request a new code.',
          locked: true,
        },
        { status: 429, headers: CORS }
      );
    }

    if (new Date() > new Date(user.resetOtpExpiresAt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code.' },
        { status: 400, headers: CORS }
      );
    }

    const submittedHash = createHash('sha256').update(otp).digest('hex');
    const isOtpValid =
      submittedHash.length === user.resetOtpHash.length &&
      timingSafeEqual(Buffer.from(submittedHash, 'utf-8'), Buffer.from(user.resetOtpHash, 'utf-8'));

    if (!isOtpValid) {
      user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
      await user.save();

      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification code.' },
        { status: 400, headers: CORS }
      );
    }

    // Issue single-use JTI and burn the OTP immediately so OTP cannot be re-verified
    const resetJti = randomUUID();
    const resetJtiHash = createHash('sha256').update(resetJti).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    user.resetOtpAttempts = 0;
    user.resetTokenHash = resetJtiHash;
    user.resetTokenExpiresAt = expiresAt;
    await user.save();

    if (hasRedis && redis) {
      await redis
        .set(`reset:jti:${resetJtiHash}`, user._id.toString(), { ex: RESET_TOKEN_TTL_SECONDS })
        .catch(() => {});
    }

    const secret = getJwtSecret();

    const resetToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        purpose: 'password_reset',
        jti: resetJti,
      },
      secret,
      { expiresIn: '10m', algorithm: 'HS256' }
    );

    return NextResponse.json(
      {
        success: true,
        resetToken,
        message: 'Code verified. You can now set a new password.',
      },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[verify-reset-otp]', getSafeErrorMessage(err));
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
