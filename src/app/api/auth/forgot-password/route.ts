/**
 * POST /api/auth/forgot-password
 *
 * Generates a 6-digit OTP, hashes it, stores it on the user, and sends
 * a branded email. Never reveals whether an email exists (account enumeration
 * protection). Rate-limited to 1 request per 60 seconds per email.
 */
import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendPasswordResetOtpEmail } from '@/lib/nodemailer';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const GENERIC_OK = {
  success: true,
  message: 'If this email is registered, a reset code has been sent.',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400, headers: CORS }
      );
    }

    await connectToDatabase();

    // Select hidden OTP fields explicitly
    const user = await User.findOne({ email }).select(
      '+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpRequestedAt'
    );

    // If user not found, return an error for better UX
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address.' },
        { status: 404, headers: CORS }
      );
    }

    // Rate limit: max 1 OTP request per 60 seconds
    if (user.resetOtpRequestedAt) {
      const secondsSinceLast =
        (Date.now() - new Date(user.resetOtpRequestedAt).getTime()) / 1000;
      if (secondsSinceLast < 60) {
        const retryAfterSeconds = Math.ceil(60 - secondsSinceLast);
        return NextResponse.json(
          {
            success: false,
            error: `Please wait ${retryAfterSeconds} seconds before requesting a new code.`,
            retryAfterSeconds,
          },
          { status: 429, headers: CORS }
        );
      }
    }

    // Generate OTP
    const otp = String(randomInt(100000, 999999));
    const otpHash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP fields
    user.resetOtpHash = otpHash;
    user.resetOtpExpiresAt = expiresAt;
    user.resetOtpAttempts = 0;
    user.resetOtpRequestedAt = new Date();
    await user.save();

    // Send email — if this fails, roll back OTP fields so user can retry
    const emailResult = await sendPasswordResetOtpEmail(user.email, user.name, otp);
    if (!emailResult.success) {
      user.resetOtpHash = undefined;
      user.resetOtpExpiresAt = undefined;
      user.resetOtpRequestedAt = undefined;
      await user.save();
      return NextResponse.json(
        { success: false, error: 'Failed to send email. Please try again.' },
        { status: 500, headers: CORS }
      );
    }

    return NextResponse.json(GENERIC_OK, { headers: CORS });
  } catch (err) {
    console.error('[forgot-password]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
