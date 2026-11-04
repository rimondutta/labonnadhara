/**
 * POST /api/auth/verify-reset-otp
 *
 * Verifies the 6-digit OTP sent to the customer's email.
 * Issues a short-lived reset token (JWT, 10 min, purpose: "password_reset")
 * on success. Locks out after 5 failed attempts.
 */
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret } from '@/lib/jwt-secret';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const CORS = mobileCorsHeaders(req);
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

    const body = await req.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const otp = String(body.otp ?? '').trim();

    if (!email || !otp || otp.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Email and a 6-digit code are required.' },
        { status: 400, headers: CORS }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email }).select(
      '+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpRequestedAt'
    );

    // Generic error — don't reveal account existence
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired code. Please request a new one.' },
        { status: 400, headers: CORS }
      );
    }

    // Lockout check
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

    // Expiry check
    if (new Date() > new Date(user.resetOtpExpiresAt)) {
      return NextResponse.json(
        { success: false, error: 'Code has expired. Please request a new one.' },
        { status: 400, headers: CORS }
      );
    }

    // Timing-safe comparison of the SHA-256 hash
    const submittedHash = createHash('sha256').update(otp).digest('hex');
    const isOtpValid =
      submittedHash.length === user.resetOtpHash.length &&
      timingSafeEqual(Buffer.from(submittedHash, 'utf-8'), Buffer.from(user.resetOtpHash, 'utf-8'));

    if (!isOtpValid) {
      // Increment failed attempts
      user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
      await user.save();

      const remaining = MAX_ATTEMPTS - user.resetOtpAttempts;
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect code. ${remaining > 0 ? `${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` : 'Please request a new code.'}`,
          attemptsRemaining: remaining,
        },
        { status: 400, headers: CORS }
      );
    }

    // OTP correct — clear attempts
    user.resetOtpAttempts = 0;
    await user.save();

    const secret = getJwtSecret();

    // Issue a short-lived reset token scoped to password_reset only
    const resetToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        purpose: 'password_reset',
      },
      secret,
      { expiresIn: '10m' }
    );

    return NextResponse.json(
      { success: true, resetToken },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[verify-reset-otp]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
