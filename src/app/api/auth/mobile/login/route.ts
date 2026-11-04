import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "@/lib/jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";
import { mobileCorsHeaders } from "@/lib/cors";
import { createRefreshToken } from "@/lib/refresh-token";

export async function POST(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
          },
        }
      );
    }

    await connectToDatabase();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select("+password");
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const secret = getJwtSecret();

    // Access token: 7 days (reduced from 30d for security)
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

    // Refresh token: 30-day revocable token stored in Redis
    const refreshToken = await createRefreshToken(user._id.toString());

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          ...(refreshToken ? { refreshToken } : {}),
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
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
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
