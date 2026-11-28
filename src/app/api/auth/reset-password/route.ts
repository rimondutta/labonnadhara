/**
 * POST /api/auth/reset-password
 * Consumes a single-use password reset JWT (`jti`), updates the user password,
 * and revokes all active mobile refresh tokens (V-12).
 */
import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret } from '@/lib/jwt-secret';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';
import { redis, hasRedis } from '@/lib/redis';
import { revokeAllUserRefreshTokens } from '@/lib/refresh-token';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function POST(req: Request) {
  const CORS = { ...mobileCorsHeaders(req), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before retrying.' },
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
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400, headers: CORS });
    }

    const resetToken = typeof body.resetToken === 'string' ? body.resetToken.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required.' },
        { status: 400, headers: CORS }
      );
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json(
        { success: false, error: 'Password must be between 8 and 72 characters.' },
        { status: 400, headers: CORS }
      );
    }

    const secret = getJwtSecret();
    let payload: { id?: string; email?: string; purpose?: string; jti?: string };
    try {
      payload = jwt.verify(resetToken, secret, { algorithms: ['HS256'] }) as typeof payload;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Reset link has expired or is invalid. Please request a new one.' },
        { status: 401, headers: CORS }
      );
    }

    if (
      payload.purpose !== 'password_reset' ||
      !payload.id ||
      typeof payload.jti !== 'string' ||
      !payload.jti
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid or already consumed reset token.' },
        { status: 401, headers: CORS }
      );
    }

    const resetJtiHash = createHash('sha256').update(payload.jti).digest('hex');

    // Enforce atomic single-use JTI check in Redis when available
    if (hasRedis && redis) {
      const redisOwnerId = await redis.getdel<string>(`reset:jti:${resetJtiHash}`).catch(() => null);
      if (redisOwnerId !== null && redisOwnerId !== payload.id) {
        return NextResponse.json(
          { success: false, error: 'Reset token has already been used or expired.' },
          { status: 401, headers: CORS }
        );
      }
    }

    await connectToDatabase();

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atomic MongoDB single-use compare-and-clear so concurrent replays cannot reuse token even if Redis bypassed
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: payload.id,
        resetTokenHash: resetJtiHash,
        resetTokenExpiresAt: { $gt: new Date() },
      },
      {
        $set: {
          password: hashedPassword,
          resetOtpAttempts: 0,
        },
        $unset: {
          resetTokenHash: 1,
          resetTokenExpiresAt: 1,
          resetOtpHash: 1,
          resetOtpExpiresAt: 1,
          resetOtpRequestedAt: 1,
        },
      },
      { returnDocument: 'after' }
    ).select('_id');

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Reset token has already been used or has expired.' },
        { status: 401, headers: CORS }
      );
    }

    // Revoke all existing mobile refresh tokens for this user
    await revokeAllUserRefreshTokens(updatedUser._id.toString());

    return NextResponse.json(
      { success: true, message: 'Password updated successfully. You can now log in.' },
      { headers: CORS }
    );
  } catch (err) {
    console.error('[reset-password]', getSafeErrorMessage(err));
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
