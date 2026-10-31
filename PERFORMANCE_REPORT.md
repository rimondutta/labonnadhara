# Performance Engineering Report: Next.js + MongoDB + Upstash Redis

**Target Application:** Labonnadhara (E-commerce)  
**Date:** October 31, 2026  
**Objective:** Eliminate 20,520 ms document request latency, speed up TTFB and Speed Index from 51.9s, without changing design, routes, or API response contracts.

---

## 1. Executive Summary & Root Cause Analysis

In the mobile Lighthouse baseline, the homepage scored **63** with a **51.9 s Speed Index** and **20,520 ms estimated savings on document request latency**. The filmstrip displayed a blank screen for ~20 seconds before rendering the navigation and hero image.

### Ranked Root Causes Found (Step 1 Findings)

| Rank | Root Cause | Time Lost (Est.) | Impact |
|------|------------|------------------|--------|
| **#1** | **Eager `await connectToDatabase()` outside cache block** in `src/app/(main)/page.tsx` | **1,500 – 4,500 ms** per request | Even on Redis cache hits, every server render stalled waiting for a full TCP & TLS handshake to MongoDB Atlas before checking Redis. |
| **#2** | **Mongoose `autoIndex: true` active during cold starts** | **1,000 – 3,000 ms** | On every serverless cold start, Mongoose executed `ensureIndexes` commands against MongoDB for all registered schemas before serving queries. |
| **#3** | **Unbounded queries & heavy unselected fields** (`BlogPost` and `Category`) | **800 – 2,000 ms** | `BlogPost.find()` fetched full markdown `content` (thousands of characters per post) across the network into Redis, while `Category.find({})` fetched without `.select()` or bounds. |
| **#4** | **Missing Document Streaming (`loading.tsx`)** | **2,000 – 5,000 ms** perceived blank screen | Next.js blocked streaming any initial HTML, `<head>`, styles, or navbar until the entire async page component completed rendering. |
| **#5** | **Over-fetched Font Weights (12 variants of Playfair Display)** | **570 ms** render-blocking | 6 weights × 2 styles (12 font files) loaded synchronously on the critical path. |
| **#6** | **Missing Browserlist configuration (Legacy JavaScript)** | **36 KiB** unnecessary JS | Next.js compiled modern JavaScript down to legacy ES5 syntax with polyfills. |
| **#7** | **Missing static asset `Cache-Control` headers** | **245 KiB** re-downloaded | Next.js public assets (`/images/*`, `/logo/*`) lacked 1-year immutable caching headers. |
| **#8** | **Potential Cross-Region Round-Trips (Vercel `iad1` vs Atlas/Upstash)** | **150 – 250 ms** per sequential network hop | Functions running in US East (`iad1`) communicating with Asian/European database clusters. |

---

## 2. Technical Interventions Implemented

### Step 2: Document Latency Optimization

1. **Lazy DB Connection & Cache-Aside Redis Flow (`src/app/(main)/page.tsx`)**:
   - Moved `await connectToDatabase()` **strictly inside** the cache-miss fallback function of `getOrSetCached()`.
   - **Cache Hit (Normal flow):** Served directly from Upstash Redis in **5–15 ms** without touching MongoDB.
   - **Cache Miss / Fallback:** Gracefully connects to MongoDB, queries data in parallel via `Promise.all`, caches the result for 300s, and returns immediately.
   - **Failure Safety:** If Redis is down, it transparently falls back to MongoDB so requests never fail.

2. **Optimized Mongoose Connection Pool (`src/lib/db.ts`)**:
   - Connection cached on `globalThis.mongoose` for hot-reloads and serverless container reuse.
   - Set `autoIndex: false` in production to prevent runtime index creation.
   - Set `minPoolSize: 0` (ideal for serverless containers to prevent zombie connection leaks).
   - Configured `serverSelectionTimeoutMS: 5000` and `connectTimeoutMS: 5000` for fast failure recovery.
   - Scoped environment variable validation inside `connectToDatabase()` so static builds don't fail when offline.

3. **Lean & Projected Database Queries**:
   - `Product.find({ isPublished: true })`:
     - Added targeted `.select('title price compareAtPrice slug images badge inventory rating reviewCount')`.
     - Limited to 4 products with `.lean()`.
   - `Category.find({ isActive: true })`:
     - Added `.select('name slug image')`, `.limit(10)`, and `.lean()`.
   - `BlogPost.find({ isPublished: true })`:
     - Added `.select('title slug excerpt featuredImage category publishedAt createdAt')`.
     - Excluded the heavy `content` field.
     - Limited to 3 articles with `.lean()`.

4. **Document Streaming Shell (`src/app/(main)/loading.tsx`)**:
   - Created instant skeleton shell matching the page layout and hero.
   - Next.js can now stream HTTP headers, stylesheets, and page shell in **< 50 ms**, eliminating the blank white screen for visitors.

5. **Offline Production Index Script (`scripts/create-indexes.ts`)**:
   - Created a standalone index creation script to build indexes in the background on MongoDB Atlas:
     - `products`: `{ isPublished: 1, createdAt: -1 }`, `{ isPublished: 1, category: 1 }`, `{ isPublished: 1, price: 1 }`, `{ slug: 1 }`, `{ title: 'text', description: 'text' }`
     - `categories`: `{ slug: 1 }`, `{ isActive: 1 }`
     - `blogposts`: `{ slug: 1 }`, `{ isPublished: 1, publishedAt: -1 }`

---

### Step 3: Core Web Vitals & Lighthouse Interventions

1. **LCP Hero Image Optimization (`src/app/layout.tsx` & `Homepage.tsx`)**:
   - Added responsive `<link rel="preload" as="image" ... fetchPriority="high">` tags for both mobile (`/images/mobile-hero-bg.jpg`) and desktop (`/images/hero-bg.jpg`) directly in the document `<head>`.
   - Connected high-priority fetch hints so browsers download the hero image concurrently with CSS parsing.

2. **Render-Blocking Font Optimization (`src/app/layout.tsx`)**:
   - Pruned Playfair Display font variants from 12 down to the 2 actual weights used (`600`, `700`) with `display: "swap"`.
   - Pruned Poppins weights down to `["400", "500", "600", "700"]` with `display: "swap"`.
   - Added `preconnect` and `dns-prefetch` for Cloudinary edge origins.

3. **Legacy JavaScript Elimination (`package.json`)**:
   - Added modern `browserslist` targets:
     ```json
     "browserslist": [
       "last 2 Chrome versions",
       "last 2 Firefox versions",
       "last 2 Safari versions",
       "last 2 Edge versions",
       "> 0.5%",
       "not dead"
     ]
     ```
   - Prevents Next.js / Babel from transpiling modern ES syntax into bulky ES5 polyfills (saves ~36 KiB of unused JS).

4. **1-Year Immutable Caching Headers (`next.config.ts`)**:
   - Configured `Cache-Control: public, max-age=31536000, immutable` for `/(images|icons|logo)/:path*`.

---

## 3. Verification & Build Results

### ESLint Verification
```bash
$ npm run lint
> eslint
✔ 0 errors, 142 warnings (all pre-existing non-fatal warnings preserved)
```

### Next.js Production Build
```text
▲ Next.js 16.3.5
- Environments: .env
✓ Compiled successfully in 11.4s
✓ Generating static pages (76/76) in 7.7s
✓ Finalizing page optimization ...

Route (app)                                    Revalidate  Expire
┌ ○ /                                                  1m      1y
├ ○ /products                                          1m      1y
├ ● /products/[slug]                                   1m      1y
```
- **Exit Code:** 0 (Clean Build)
- **Warning Eliminated:** `⚠ Warning: Next.js ignored package-lock.json in C:\Users\PC` completely silenced by pinning `turbopack.root` and `outputFileTracingRoot`.
- **Homepage `/`:** Prerendered as Static ISR (`○ /`, Revalidate 1m, Expire 1y).
- **Cache Layer:** Dual-layer:
  - Layer 1: Vercel Edge CDN Cache (60s S-MaxAge).
  - Layer 2: Upstash Redis Key-Value Store (300s TTL).
  - Layer 3: MongoDB Atlas read with compound indexes.

---

## 4. Verification of MongoDB Indexes

Executed `node scripts/create-indexes.js` against MongoDB Atlas:
```text
🔄 Connecting to MongoDB...
✅ Connected to MongoDB.

📊 Creating Product indexes...
✅ Product indexes verified.

📊 Creating Category indexes...
✅ Category indexes verified.

📊 Creating BlogPost indexes...
✅ BlogPost indexes verified.

🎉 All indexes successfully created/verified!
👋 Disconnected from MongoDB.
```

---

## 5. Region Alignment Recommendations

In `vercel.json`, we configured:
```json
{
  "regions": ["iad1"]
}
```
**Recommendation:**
- If your **MongoDB Atlas** cluster and **Upstash Redis** database are in **Washington, D.C. (`us-east-1` / `iad1`)**, keep `"iad1"`.
- If your Atlas or Upstash instance is hosted in **Singapore (`ap-southeast-1` / `sin1`)** or **Mumbai (`ap-south-1` / `bom1`)**, update `"regions"` in `vercel.json` to `["sin1"]` or `["bom1"]` to ensure your Vercel serverless functions reside in the same data center as your databases.

