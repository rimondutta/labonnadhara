import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const ratelimit = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(30, "10 s"),
      analytics: true,
    })
  : null;

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname;

      // Protect both admin dashboard pages AND admin API routes
      const isAdminRoute =
        (path.startsWith('/admin') && !path.startsWith('/admin/login')) ||
        path.startsWith('/api/admin');

      if (isAdminRoute) {
        return token?.role === "admin" || token?.role === "manager"
      }
      return true
    },
  },
  pages: {
    signIn: "/admin/login",
  }
});

import { NextRequest, NextFetchEvent } from 'next/server';

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  // Rate limiting on all /api/ routes EXCEPT NextAuth internals
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth/')
  if (!isAuthRoute && req.nextUrl.pathname.startsWith('/api/') && ratelimit) {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString()
          }
        }
      );
    }
  }

  // Pass to Auth Middleware
  return (authMiddleware as any)(req, event);
}

export const config = {
  // Match both admin routes and ALL API routes
  matcher: ["/admin/:path*", "/api/:path*"],
}
