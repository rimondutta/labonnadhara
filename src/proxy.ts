import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
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

/**
 * Next.js 16 Proxy / Middleware
 */
export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. Rate limiting on /api/* routes
  if (pathname.startsWith('/api/')) {
    const isAuthRoute = pathname.startsWith('/api/auth/');
    const limiter = isAuthRoute ? authEdgeRatelimit : generalRatelimit;

    if (limiter) {
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
    }
  }

  // 2. Admin API Guard (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    // If client passes a Bearer token, let it through to handler-level mobile/custom auth
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
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
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token as { role?: string } | null)?.role;

    if (role !== "admin" && role !== "manager") {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match both admin routes and all API routes
  matcher: ["/admin/:path*", "/api/:path*"],
};
