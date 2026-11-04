import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { mobileCorsHeaders } from "@/lib/cors";
import { consumeRefreshToken, createRefreshToken } from "@/lib/refresh-token";
import { getSafeErrorMessage } from "@/lib/api-error";

/**
 * POST /api/auth/mobile/refresh
 *
 * Exchanges a valid refresh token for a new short-lived access token and a
 * rotated refresh token. Implements single-use token rotation — the submitted
 * refresh token is consumed (deleted) before the new pair is issued.
 *
 * Body: { refreshToken: string }
 * Returns: { success, data: { token, refreshToken, expiresIn, user } }
 */
export async function POST(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);

  try {
    // Rate limit by IP — prevents refresh token brute-force
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, "auth");
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Retry-After": String(
              Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))
            ),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const { refreshToken } = body ?? {};

    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Refresh token is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Consume (single-use rotation) — returns the userId if the token is valid
    const userId = await consumeRefreshToken(refreshToken);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired refresh token. Please log in again.",
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Load the user to ensure they still exist and are active
    await connectToDatabase();
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Account not found. Please log in again." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const secret = getJwtSecret();

    // Issue new 7-day access token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: "7d" }
    );

    // Issue rotated refresh token (new opaque token stored in Redis)
    const newRefreshToken = await createRefreshToken(user._id.toString());

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          ...(newRefreshToken ? { refreshToken: newRefreshToken } : {}),
          expiresIn: 7 * 24 * 60 * 60, // seconds
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Mobile token refresh error:", getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: mobileCorsHeaders(request),
  });
}

