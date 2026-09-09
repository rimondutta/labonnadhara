/**
 * POST /api/auth/reset-password
 *
 * Accepts the reset token (from verify-reset-otp) and a new password.
 * Verifies the JWT purpose claim, hashes the new password with bcrypt,
 * and clears all OTP fields from the user.
 */
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback_secret_for_dev';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resetToken, newPassword } = body;

    if (!resetToken || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Reset token and new password are required.' },
        { status: 400, headers: CORS }
      );
    }

    // Validate password strength (min 8 chars)
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters.' },
        { status: 400, headers: CORS }
      );
    }

    // Verify JWT and check purpose
    let payload: any;
    try {
      payload = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Reset link has expired or is invalid. Please request a new one.' },
        { status: 401, headers: CORS }
      );
    }

    if (payload.purpose !== 'password_reset') {
      return NextResponse.json(
        { success: false, error: 'Invalid token.' },
        { status: 401, headers: CORS }
      );
    }

    await connectToDatabase();

    const user = await User.findById(payload.id).select(
      '+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts +resetOtpRequestedAt'
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found.' },
        { status: 404, headers: CORS }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;

    // Clear all OTP fields
    user.resetOtpHash = undefined;
    user.resetOtpExpiresAt = undefined;
    user.resetOtpAttempts = 0;
    user.resetOtpRequestedAt = undefined;

    await user.save();

    return NextResponse.json(
      { success: true, message: 'Password updated successfully. You can now log in.' },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}
