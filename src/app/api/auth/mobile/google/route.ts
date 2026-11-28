import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';
import { getJwtSecret } from '@/lib/jwt-secret';
import { createRefreshToken } from '@/lib/refresh-token';
import { JWT_ISSUER, JWT_AUDIENCE } from '@/lib/bearer-token';
import { getSafeErrorMessage } from '@/lib/api-error';

const ALLOWED_GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

const googleAuthBodySchema = z
  .object({
    accessToken: z.string().trim().min(10).max(4096).optional(),
    idToken: z.string().trim().min(10).max(8192).optional(),
  })
  .strict()
  .refine((data) => Boolean(data.accessToken || data.idToken), {
    message: 'Google access token or ID token is required',
  });

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}

function getAllowedClientIds(): string[] {
  const envVal = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '';
  return envVal
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many authentication attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const allowedClientIds = getAllowedClientIds();
    if (allowedClientIds.length === 0) {
      console.error('[Google Auth] Configuration error: GOOGLE_CLIENT_ID(S) is not configured');
      return NextResponse.json(
        { success: false, error: 'Google authentication is not configured on this server' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = googleAuthBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid request payload' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { accessToken, idToken } = parsed.data;

    let email = '';
    let name = '';
    let picture = '';
    let emailVerified = false;

    if (idToken) {
      try {
        const authClient = new OAuth2Client();
        const ticket = await authClient.verifyIdToken({
          idToken,
          audience: allowedClientIds,
        });
        const payload = ticket.getPayload();
        const tokenAud = typeof payload?.aud === 'string' ? payload.aud : '';
        const tokenIss = typeof payload?.iss === 'string' ? payload.iss : '';
        const tokenExp = typeof payload?.exp === 'number' ? payload.exp : 0;

        if (
          !payload ||
          !allowedClientIds.includes(tokenAud) ||
          !ALLOWED_GOOGLE_ISSUERS.has(tokenIss) ||
          tokenExp * 1000 <= Date.now()
        ) {
          return NextResponse.json(
            { success: false, error: 'Invalid Google ID token claims' },
            { status: 401, headers: CORS_HEADERS }
          );
        }

        email = (payload.email || '').trim().toLowerCase();
        name = payload.name || '';
        picture = payload.picture || '';
        emailVerified = payload.email_verified === true;
      } catch (idErr) {
        console.error('[Google Auth] ID Token verification failed:', getSafeErrorMessage(idErr));
        return NextResponse.json(
          { success: false, error: 'Invalid Google ID token or audience mismatch' },
          { status: 401, headers: CORS_HEADERS }
        );
      }
    } else if (accessToken) {
      let tokenInfoEmail = '';
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
        );
        if (!tokenInfoRes.ok) {
          return NextResponse.json(
            { success: false, error: 'Failed to verify Google access token' },
            { status: 401, headers: CORS_HEADERS }
          );
        }

        const tokenInfo = (await tokenInfoRes.json()) as {
          aud?: string;
          issued_to?: string;
          azp?: string;
          exp?: string | number;
          expires_in?: string | number;
          email?: string;
          email_verified?: string | boolean;
        };

        const tokenAud = tokenInfo.aud || tokenInfo.issued_to || tokenInfo.azp || '';
        if (!tokenAud || !allowedClientIds.includes(tokenAud)) {
          return NextResponse.json(
            { success: false, error: 'Invalid token audience' },
            { status: 401, headers: CORS_HEADERS }
          );
        }

        const expiresIn = Number(tokenInfo.expires_in ?? 0);
        const expUnix = Number(tokenInfo.exp ?? 0);
        const isUnexpired =
          (Number.isFinite(expiresIn) && expiresIn > 0) ||
          (Number.isFinite(expUnix) && expUnix * 1000 > Date.now());

        if (!isUnexpired) {
          return NextResponse.json(
            { success: false, error: 'Expired Google access token' },
            { status: 401, headers: CORS_HEADERS }
          );
        }

        tokenInfoEmail = (tokenInfo.email || '').trim().toLowerCase();
      } catch (verifyErr) {
        console.error('[Google Auth] Access token verification error:', getSafeErrorMessage(verifyErr));
        return NextResponse.json(
          { success: false, error: 'Failed to validate Google token' },
          { status: 401, headers: CORS_HEADERS }
        );
      }

      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!googleRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired Google access token' },
          { status: 401, headers: CORS_HEADERS }
        );
      }

      const googleUser = (await googleRes.json()) as {
        email?: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      email = (googleUser.email || '').trim().toLowerCase();
      name = googleUser.name || '';
      picture = googleUser.picture || '';
      emailVerified = googleUser.email_verified === true;

      if (tokenInfoEmail && email && tokenInfoEmail !== email) {
        return NextResponse.json(
          { success: false, error: 'Google account identity mismatch' },
          { status: 401, headers: CORS_HEADERS }
        );
      }
    }

    if (!email || !emailVerified) {
      return NextResponse.json(
        { success: false, error: 'Google account email is not verified' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();

    // Prevent OAuth account auto-linking from bypassing password security on admin/manager accounts
    const existingStaff = await User.findOne({
      email,
      role: { $in: ['admin', 'manager'] },
    })
      .select('_id role')
      .lean();

    if (existingStaff) {
      return NextResponse.json(
        {
          success: false,
          error: 'Privileged accounts must sign in using password authentication',
        },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: name || email.split('@')[0],
          email,
          password: passwordHash,
          role: 'customer',
        },
        ...(picture ? { $set: { image: picture } } : {}),
      },
      { upsert: true, returnDocument: 'after' }
    );

    const secret = getJwtSecret();

    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      {
        expiresIn: '7d',
        algorithm: 'HS256',
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }
    );

    const refreshToken = await createRefreshToken(user._id.toString());

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          refreshToken,
          expiresIn: 7 * 24 * 60 * 60,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image,
          },
        },
      },
      { headers: { ...CORS_HEADERS, 'Cache-Control': 'private, no-store, max-age=0' } }
    );
  } catch (error: unknown) {
    console.error('Mobile Google Auth Error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
