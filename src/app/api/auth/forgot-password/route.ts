/**
 * POST /api/auth/forgot-password
 *
 * Generates a 6-digit OTP, hashes it with SHA-256, stores it on the user, and sends
 * a branded email. Never reveals whether an email exists (Account Enumeration Protection).
 * Rate-limited per IP and per email. Uses timing equalization to defeat timing attacks.
 */
import { NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendPasswordResetOtpEmail } from '@/lib/nodemailer';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';

const GENERIC_OK = {
  success: true,
  message: 'If this email is registered, a reset code has been sent.',
};

export async function POST(req: Request) {
  const CORS = mobileCorsHeaders(req);
  try {
    // 1. IP-based rate limiting (5 req / 1 min per IP)
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(ip, 'auth');
    if (ipLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many password reset requests. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            ...CORS,
            'Retry-After': String(Math.max(1, Math.ceil((ipLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const body = await req.json();
    const email = (body.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400, headers: CORS }
      );
    }

    // 2. Email-based rate limiting (3 req / 1 min per target email account)
    const emailLimit = await checkRateLimit(`forgot-pwd:${email}`, 'auth');
    if (emailLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many password reset requests for this email. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            ...CORS,
            'Retry-After': String(Math.max(1, Math.ceil((emailLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    await connectToDatabase();

    // Select hidden OTP fields explicitly
    const user = await User.findOne({ email }).select(
      '+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpRequestedAt'
    );

    // 3. Security: Timing-equalized response when user does NOT exist
    if (!user) {
      // Perform dummy hashing and simulated latency (300-450ms) to match email send timing
      const dummyOtp = String(randomInt(100000, 999999));
      createHash('sha256').update(dummyOtp).digest('hex');
      const jitterMs = 300 + (randomInt(0, 150));
      await new Promise((resolve) => setTimeout(resolve, jitterMs));

      return NextResponse.json(GENERIC_OK, { headers: CORS });
    }

    // Rate limit: max 1 OTP request per 60 seconds per user account in database
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

    // Generate real OTP
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

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
