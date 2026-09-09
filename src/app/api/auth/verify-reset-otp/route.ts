/**
 * POST /api/auth/verify-reset-otp
 *
 * Verifies the 6-digit OTP sent to the customer's email.
 * Issues a short-lived reset token (JWT, 10 min, purpose: "password_reset")
 * on success. Locks out after 5 failed attempts.
 */
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_dev';
const MAX_ATTEMPTS = 5;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(req: Request) {
  try {
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

    // Hash the submitted OTP and compare
    const submittedHash = createHash('sha256').update(otp).digest('hex');
    if (submittedHash !== user.resetOtpHash) {
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

    // ✅ OTP correct — clear attempts
    user.resetOtpAttempts = 0;
    await user.save();

    // Issue a short-lived reset token scoped to password_reset only
    const resetToken = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        purpose: 'password_reset',
      },
      JWT_SECRET,
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
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
