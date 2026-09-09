import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback_secret_for_dev";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Google access token is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Verify the Google access token and get user info from Google's userinfo endpoint
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
    );

    if (!googleRes.ok) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired Google token" },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const googleUser = await googleRes.json();
    const { email, name, picture, email_verified } = googleUser;

    if (!email || !email_verified) {
      return NextResponse.json(
        { success: false, error: "Google account email is not verified" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();

    // Upsert user — create on first login, just update image on subsequent logins
    const passwordHash = await bcrypt.hash(randomUUID(), 10);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name: name || email.split("@")[0],
          email,
          password: passwordHash,
          role: "customer",
        },
        $set: { image: picture },
      },
      { upsert: true, new: true }
    );

    // Issue our custom mobile JWT (same format as email/password login)
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
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
  } catch (error: any) {
    console.error("Mobile Google login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
