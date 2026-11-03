import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { getAuthSecret } from "@/lib/jwt-secret";
import { checkRateLimit, getClientIp } from "@/lib/ratelimit";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

function getAllowedClientIds(): string[] {
  const envVal = process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "";
  return envVal
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { success: false, error: "Too many authentication attempts. Please try again later." },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const body = await req.json();
    const { accessToken, idToken } = body;

    if (!accessToken && !idToken) {
      return NextResponse.json(
        { success: false, error: "Google access token or ID token is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const allowedClientIds = getAllowedClientIds();

    let email = "";
    let name = "";
    let picture = "";
    let emailVerified = false;

    // 1. If idToken is provided, verify using OAuth2Client
    if (idToken) {
      try {
        const authClient = new OAuth2Client();
        const ticket = await authClient.verifyIdToken({
          idToken: String(idToken).trim(),
          audience: allowedClientIds.length > 0 ? allowedClientIds : undefined,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email || "";
          name = payload.name || "";
          picture = payload.picture || "";
          emailVerified = Boolean(payload.email_verified);
        }
      } catch (idErr) {
        console.error("[Google Auth] ID Token verification failed:", idErr);
        return NextResponse.json(
          { success: false, error: "Invalid Google ID token or audience mismatch." },
          { status: 401, headers: CORS_HEADERS }
        );
      }
    } else if (accessToken) {
      // 2. Access Token verification (existing mobile format)
      // Call tokeninfo to check audience / azp / issued_to
      if (allowedClientIds.length > 0) {
        try {
          const tokenInfoRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
          );
          if (!tokenInfoRes.ok) {
            return NextResponse.json(
              { success: false, error: "Failed to verify Google access token validity." },
              { status: 401, headers: CORS_HEADERS }
            );
          }
          const tokenInfo = await tokenInfoRes.json();
          const tokenAud = tokenInfo.aud || tokenInfo.issued_to || tokenInfo.azp;

          if (!tokenAud || !allowedClientIds.includes(tokenAud)) {
            console.error('[Google Auth] Audience mismatch:', tokenAud, 'Expected one of:', allowedClientIds);
            return NextResponse.json(
              { success: false, error: "Invalid token audience. Confused deputy prevented." },
              { status: 401, headers: CORS_HEADERS }
            );
          }
        } catch (tokenInfoErr) {
          console.error('[Google Auth] Tokeninfo network error:', tokenInfoErr);
          return NextResponse.json(
            { success: false, error: "Failed to verify token with Google auth servers." },
            { status: 502, headers: CORS_HEADERS }
          );
        }
      }

      // Fetch user profile from userinfo
      const googleRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(accessToken)}`
      );

      if (!googleRes.ok) {
        return NextResponse.json(
          { success: false, error: "Invalid or expired Google access token" },
          { status: 401, headers: CORS_HEADERS }
        );
      }

      const googleUser = await googleRes.json();
      email = googleUser.email || "";
      name = googleUser.name || "";
      picture = googleUser.picture || "";
      emailVerified = Boolean(googleUser.email_verified);
    }

    // Require verified email
    if (!email || !emailVerified) {
      return NextResponse.json(
        { success: false, error: "Google account email is not verified" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();

    // Upsert user — create on first login, update profile photo on subsequent
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        $setOnInsert: {
          name: name || email.split("@")[0],
          email: email.toLowerCase().trim(),
          password: passwordHash,
          role: "customer",
        },
        $set: { image: picture },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const secret = getAuthSecret();

    // Issue custom mobile JWT
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: "30d" }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          token,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.image || picture,
          },
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Mobile Google login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
