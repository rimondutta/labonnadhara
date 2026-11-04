import { NextResponse } from "next/server";
import { getBearerSession } from "@/lib/mobile-auth";
import { revokeAllUserRefreshTokens } from "@/lib/refresh-token";
import { mobileCorsHeaders } from "@/lib/cors";
import { getSafeErrorMessage } from "@/lib/api-error";

/**
 * POST /api/auth/mobile/logout
 *
 * Logs the current user out of all mobile sessions by revoking all active
 * refresh tokens stored in Redis. The access token (JWT) will naturally
 * expire after its remaining 7-day TTL, but all future refresh attempts
 * will be rejected immediately.
 *
 * Auth: Bearer <access_token> (required)
 */
export async function POST(req: Request) {
  const CORS_HEADERS = mobileCorsHeaders(req);

  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // Revoke all refresh tokens for this user in Redis
    await revokeAllUserRefreshTokens(session.user.id);

    return NextResponse.json(
      { success: true, message: "Logged out successfully." },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error("Mobile logout error:", getSafeErrorMessage(error));
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

