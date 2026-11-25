import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function isValidRedisConfig(url?: string, token?: string): boolean {
  if (!url || !token) return false;
  const trimmedUrl = url.trim();
  const trimmedToken = token.trim();
  if (
    trimmedUrl.includes("<") ||
    trimmedUrl.includes(">") ||
    trimmedUrl.includes("your-redis-instance") ||
    trimmedToken.includes("your_upstash_redis_rest_token")
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmedUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const hasValidRedis = isValidRedisConfig(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasValidRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!.trim(),
      token: process.env.UPSTASH_REDIS_REST_TOKEN!.trim(),
    })
  : null;

// General API rate limiter (30 req / 10s)
const generalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      analytics: true,
      prefix: "ratelimit:edge:general",
    })
  : null;

// Dedicated Auth endpoint rate limiter (5 req / 1 min)
const authEdgeRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "ratelimit:edge:auth",
    })
  : null;

function isSensitiveAuthRequest(req: NextRequest, pathname: string): boolean {
  if (!pathname.startsWith("/api/auth/")) return false;
  if (req.method !== "GET" && req.method !== "HEAD") return true;
  return (
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/verify-reset-otp") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/mobile/")
  );
}

async function getVerifiedSessionToken(req: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) {
    console.error("[proxy] NEXTAUTH_SECRET is missing or empty; session tokens cannot be verified.");
    return null;
  }

  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const reqIsHttps = req.nextUrl.protocol === "https:" || forwardedProto === "https";
  const envIsHttps = process.env.NEXTAUTH_URL
    ? process.env.NEXTAUTH_URL.startsWith("https://")
    : Boolean(process.env.VERCEL);
  const primarySecure = reqIsHttps || envIsHttps;

  const token = await getToken({ req, secret, secureCookie: primarySecure });
  if (token || reqIsHttps) {
    return token;
  }

  // On plain HTTP local dev, fall back to the opposite cookie prefix in case
  // NEXTAUTH_URL/VERCEL differs from the local HTTP request protocol.
  return await getToken({ req, secret, secureCookie: !primarySecure });
}

/**
 * Next.js 16 Proxy / Middleware
 */
export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. Rate limiting on /api/* routes
  if (pathname.startsWith('/api/')) {
    const limiter = isSensitiveAuthRequest(req, pathname) ? authEdgeRatelimit : generalRatelimit;

    if (limiter) {
      try {
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0]?.trim() : (req.headers.get("x-real-ip") ?? "127.0.0.1");
        const { success, limit, reset, remaining } = await limiter.limit(ip);

        if (!success) {
          return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            {
              status: 429,
              headers: {
                'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            }
          );
        }
      } catch (err) {
        console.warn("[proxy] Rate limiter encountered an error; permitting request:", err);
      }
    }
  }

  // 2. Admin API Guard (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    // If client passes a Bearer token, let it through to handler-level mobile/custom auth
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return NextResponse.next();
    }

    const token = await getVerifiedSessionToken(req);
    const role = (token as { role?: string } | null)?.role;

    if (role !== "admin" && role !== "manager") {
      return NextResponse.json(
        { error: "Unauthorized: Admin or manager access required" },
        { status: 401 }
      );
    }
  }

  // 3. Admin Dashboard Pages Guard (/admin/*)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = await getVerifiedSessionToken(req);
    const role = (token as { role?: string } | null)?.role;

    if (role !== "admin" && role !== "manager") {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match both admin routes and all API routes
  matcher: ["/admin/:path*", "/api/:path*"],
};
