# Cloudflare Production Setup Guide for Toy Hourse

To fully activate the new edge caching architecture, you must configure Cloudflare to respect Next.js cache headers.

## Prerequisites
1. Domain 	oyhourse.com is added to Cloudflare.
2. DNS records are proxying traffic (Orange Cloud is ON).

## Step 1: Enable Cache Reserve (Highly Recommended)
This stores your Redis/MongoDB responses at the edge longer, reducing origin hits even when data is technically "stale" if the origin drops.
- Go to **Caching** → **Cache Reserve**
- Enable it (Pricing: ~.015/GB, very cheap).

## Step 2: Configure Page Rules
Go to **Rules** → **Page Rules** and create these rules (order matters!):

### Rule 1: Bypass Cache for Admin/Auth/API Mutations
- **URL**: *toyhourse.com/admin/*
- **Setting**: Cache Level = Bypass
---
- **URL**: *toyhourse.com/account/*
- **Setting**: Cache Level = Bypass
---
- **URL**: *toyhourse.com/checkout/*
- **Setting**: Cache Level = Bypass
---
- **URL**: *toyhourse.com/api/auth/*
- **Setting**: Cache Level = Bypass

### Rule 2: API Cache (Respect Origin)
- **URL**: *toyhourse.com/api/*
- **Setting**: Cache Level = Cache Everything
- **Setting**: Origin Cache Control = On
*(Next.js is now sending public, s-maxage=60 headers which Cloudflare will obey)*

### Rule 3: Static Asset Cache
- **URL**: *toyhourse.com/_next/static/*
- **Setting**: Cache Level = Cache Everything
- **Setting**: Edge Cache TTL = A month

## Step 3: Configure Tiered Cache
Go to **Caching** → **Tiered Cache**
- Enable **Argo Tiered Cache** (Smart Tiered Cache Topology).
- This ensures if a cache miss happens in Dhaka, Cloudflare asks its regional hub (Singapore) before hitting your Vercel/VPS origin, dramatically reducing DB hits.

## Step 4: Verify
Run this command in your terminal:
`ash
curl -I https://toyhourse.com/api/products
`
Look for these headers:
- cf-cache-status: HIT (On the second request)
- cache-control: public, s-maxage=30, stale-while-revalidate=120

## (Optional) Step 5: Web Application Firewall (WAF)
Since you have a public API, add a WAF Custom Rule:
- Block if: URI Path starts with /api/ AND Threat Score > 15
"@ | Set-Content -Path "c:\Users\PC\Desktop\rimon-dutta\toyhourse\website\docs\CLOUDFLARE_SETUP.md" -Encoding UTF8

@"
# Toy Hourse: Performance & Architecture Report

## 1. What Was Fixed

### A. Database Bottlenecks
1. **N+1 Cold Start on Product Pages**: The generateMetadata function and the page component were each querying the same product from MongoDB independently. We implemented a React cache() boundary so the query resolves once and is shared across both SEO and Page layers.
2. **Missing Indexes**: Added a compound index { customerEmail: 1, createdAt: -1 } on Orders to prevent collection scans when users view their order history, and { isActive: 1 } on Category.
3. **Regex Search Performance**: The /api/v1/products route was using slow $regex string matching. It now utilizes the native MongoDB Text Index ($text) for extremely fast full-text search.

### B. Caching & Invalidation Holes
Previously, when an admin updated a category or settings, the changes wouldn't appear on the live site because the cache was never told to invalidate.
1. Added granular invalidation for **Categories** (clears only the specific category and filtered product lists, not the whole cache).
2. Added granular invalidation for **Settings/Shipping** (updates shipping rates immediately).
3. Added product invalidation to the /api/products/[id] DELETE route.

### C. Architecture Upgrades
1. **Domain-Driven Cache Layer**: Created lib/cache/products.ts, lib/cache/categories.ts, etc. This isolates caching logic, making the main Next.js routes much cleaner and preventing key-collision bugs.
2. **Silent Debug Logger**: Added lib/cache-logger.ts controlled by CACHE_DEBUG=true in .env. It logs hits/misses/errors in development but consumes 0 CPU cycles in production.

## 2. The New Architecture Flow

1. **User requests a product page.**
2. **Cloudflare CDN** intercepts. If it has a cached copy (s-maxage=60), it serves it instantly (0ms latency, 0 origin load).
3. On CDN miss, the request hits **Next.js**.
4. Next.js App Router hits the **Redis Cache** (Upstash) via lib/cache/products.ts.
5. If Redis has it, it returns instantly (~15ms latency).
6. If Redis misses, Next.js queries **MongoDB Atlas**.
7. The data is fetched, written asynchronously back to Redis (Write-Through cache), and sent to the user.

When an admin updates a product:
1. PUT /api/products/[id] fires.
2. MongoDB is updated.
3. invalidateProduct() fires:
   - Deletes exactly the right keys in Redis.
   - Calls evalidatePath() to flush the Next.js ISR cache.
4. Next user request gets the fresh data.

## 3. Recommended Next Steps
- Go to Cloudflare and apply the Page Rules in CLOUDFLARE_SETUP.md.
- Monitor Upstash dashboard to confirm your Hit/Miss ratio improves.
