# Full Website Performance Audit Report — Labonnadhara

**Audit Date:** November 28, 2026  
**Scope:** Full-stack audit of Next.js 16 (`16.4.6` installed / `^16.3.0` declared), React `19.2.4`, Mongoose/MongoDB, Upstash Redis, Vercel config (`vercel.json`), frontend layout, client bundles, and public media assets.  
**Context:** Despite the earlier October 2026 document-latency work documented in [PERFORMANCE_REPORT.md](./PERFORMANCE_REPORT.md), visitors still experience slow page loads, sluggish interactions, and redundant backend calls across the site.

---

## 1. Executive Summary

The website's slowness is caused by **four compounding bottlenecks** across every page visit:

1. **Multi-megabyte client payload & main-thread bloat on every route:** `GlobalUI` loads `Chatbot` on the first mouse move, scroll, touch, or key press — and `Chatbot.tsx` statically imports a **4.69 MB (`4,804,302` bytes) JSON file** (`public/lottie/ai.json`) directly into the JavaScript bundle alongside `lottie-react`, `react-markdown`, `remark-gfm`, `@ai-sdk/react`, and `ai`, mounting multiple simultaneous Lottie animations.
2. **Every page load triggers 3 redundant API requests + Edge Redis + MongoDB round-trips:** Visiting **any** page (even `/` or `/about`) automatically fires `/api/auth/session` (`SessionProvider`), `/api/settings/pixel` (`FacebookPixel`), and `/api/store/products?limit=4` (`SearchDrawer` mounted globally even while closed). Every `/api/*` call hits Edge rate limiting in `src/proxy.ts` (Upstash Redis REST round-trip), and several endpoints connect to MongoDB eagerly before checking cache.
3. **Cache bypasses & broken invalidation across public APIs and ISR pages:** Multiple high-traffic API endpoints (`/api/products`, `/api/store/products`, `/api/categories`, `/api/store/categories`, `/api/v1/products`, `/api/v1/products/[slug]`, `/api/v1/categories`) run `await connectToDatabase()` **before** calling `withCache()`, forcing MongoDB handshakes even on Redis cache hits. Meanwhile, `src/lib/cache/redis-cache.ts` writes to Redis unawaited (`setCached(...).catch(...)`), risking aborted writes in serverless functions, and key prefix mismatches keep stale data cached.
4. **Heavy global animation/scroll overhead & intentional UI delays:** `LenisProvider`, `FramerMotionProvider`, multiple `AnimatedReveal` instances (each dynamically importing GSAP + `ScrollTrigger`), global Swiper CSS imports in `globals.css` (for an unused `HeroSlider`), and a hardcoded **600ms artificial `setTimeout` delay** on every "Add to Cart" click (`src/components/ui/product-card-rimon.tsx:65`).

---

## 2. Ranked Performance Findings

### 🔴 Critical Issues (Highest Impact on Load Time & Responsiveness)

#### P-01. 4.69 MB Lottie JSON Statically Bundled Into `Chatbot` JS Chunk
- **Files:**
  - `src/components/Chatbot.tsx` (lines 10–13, 87–100, 119–124, 147–152, 172–177, 216–221, 259–264)
  - `src/components/layout/GlobalUI.tsx` (lines 13, 19–38, 46)
  - `public/lottie/ai.json` (`4,804,302` bytes / `4,691.7 KB`)
  - Unused lightweight alternative present: `public/lottie/ai-icon2.json` (`8,921` bytes / `8.71 KB`)
- **What happens:**
  - `Chatbot.tsx` runs `import aiAnimation from '../../public/lottie/ai.json'`, embedding **4.8 MB of raw JSON** directly inside the JavaScript chunk.
  - `GlobalUI` triggers loading `Chatbot` on the first `mousemove`, `scroll`, `touchstart`, or `keydown` event — meaning moving the mouse 1 pixel immediately triggers downloading, parsing, and evaluating ~4.7 MB of animation JSON + `lottie-react` + `react-markdown` + `remark-gfm` + `@ai-sdk/react` + `ai`.
  - When mounted, `Chatbot` renders two `<Lottie>` instances simultaneously in the launcher (`sm:hidden` and `hidden sm:block`) and additional `<Lottie>` instances inside the header, empty state, message rows, typing indicator, and input toolbar.
- **Impact:** Multi-second main-thread freeze (poor INP/TBT), multi-megabyte bandwidth spike on mobile/3G/4G connections, high memory usage.
- **Fix:**
  1. Replace `ai.json` with `ai-icon2.json` (`8.7 KB`, **99.8% smaller**) or a lightweight CSS/SVG icon for the launcher button.
  2. Only load `Chatbot` (and its AI SDK / markdown dependencies) **when the user clicks the chat launcher button**, rather than on `mousemove`/`scroll`.
  3. Avoid bundling large JSON via `import`; if Lottie is kept, `fetch()` it lazily only after interaction and mount only a single active `<Lottie>` instance.

---

#### P-02. Unnecessary Global API Waterfall on Every Single Page Load (3 Background Requests)
- **Files:**
  - `src/app/layout.tsx` (lines 108, 120)
  - `src/components/providers/NextAuthProvider.tsx` (line 6: `<SessionProvider>`)
  - `src/components/FacebookPixel.tsx` (lines 42–45: `fetch("/api/settings/pixel")`)
  - `src/components/ui/SearchDrawer.tsx` (lines 24–29: `fetch("/api/store/products?limit=4")`)
  - `src/components/layout/GlobalUI.tsx` (lines 8, 43)
- **What happens:**
  - On **every** route load (even `/` for an unauthenticated visitor who never opens Search or logs in), the browser automatically fires 3 API requests on mount:
    1. `GET /api/auth/session` (triggered by `SessionProvider` in `RootLayout`).
    2. `GET /api/settings/pixel` (triggered by `FacebookPixel` `useEffect` in `RootLayout`; `api/settings/pixel/route.ts` does not use Redis cache and calls `connectToDatabase()` on cold/revalidation runs).
    3. `GET /api/store/products?limit=4` (triggered by `SearchDrawer` `useEffect` in `GlobalUI` even when `isOpen === false`).
- **Impact:** Adds 3 competing network requests on critical initial page hydration, saturates connection slots on slow mobile networks, triggers 3 Edge rate-limiter Redis calls in `src/proxy.ts`, and triggers unnecessary MongoDB queries.
- **Fix:**
  1. In `SearchDrawer.tsx`, only fetch featured products when `isOpen` becomes `true` (and guard with a `fetchedRef` so it runs once per session), or only mount `SearchDrawer` after `isOpen` is triggered.
  2. Pass Pixel config (`pixelId`, `enabled`) from a cached Server Component (or cache `/api/settings/pixel` with `getCachedPixel` from `src/lib/cache/settings.ts` + long CDN `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`).
  3. Only mount `SessionProvider` on routes/components that require session state (`/account`, `/checkout`, `/login`, `/admin`) or pass an initial server session where needed instead of fetching `/api/auth/session` on every anonymous storefront page load.

---

#### P-03. `connectToDatabase()` Executed *Before* Redis Cache Checks Across 7+ API Routes
- **Files:**
  - `src/app/api/products/route.ts` (lines 33, 61)
  - `src/app/api/store/products/route.ts` (lines 14, 38)
  - `src/app/api/categories/route.ts` (lines 21, 23)
  - `src/app/api/store/categories/route.ts` (lines 7, 10)
  - `src/app/api/v1/products/route.ts` (lines 61, 63)
  - `src/app/api/v1/products/[slug]/route.ts` (lines 23, 25)
  - `src/app/api/v1/categories/route.ts` (lines 19, 21)
- **What happens:** Every one of these routes calls `await connectToDatabase()` **outside** the `withCache(...)` callback. On every serverless cold start or idle reconnect, the route stalls waiting for MongoDB Atlas TLS/TCP handshake + server selection **even when the data is already cached in Redis**.
- **Impact:** Adds 500ms–4,500ms latency on cold/reconnected API requests, completely negating Redis cache-hit speedups.
- **Fix:** Move `await connectToDatabase()` strictly **inside** the `withCache` / `getOrSetCached` miss-fallback callback (matching `src/app/(main)/page.tsx` and `src/app/(main)/products/page.tsx`).

---

#### P-04. Edge Middleware Rate Limiter Executes Synchronous Upstash HTTP Call on Every `/api/*` Request (+ Double Rate Limiting)
- **Files:**
  - `src/proxy.ts` (lines 101–128, 166)
  - `src/lib/ratelimit.ts` (lines 104–133)
- **What happens:**
  - `proxy.ts` intercepts **all** `/api/:path*` routes and executes `await limiter.limit(ip)` against Upstash Redis over HTTP before the route handler even starts.
  - Because `RootLayout` fires `/api/auth/session`, `/api/settings/pixel`, and `/api/store/products` on every load, every visitor page view incurs multiple synchronous Edge-to-Upstash network hops.
  - Furthermore, routes like `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/mobile/login`, `/api/store/orders`, `/api/orders/track`, `/api/payment/create-intent`, and `/api/chat` run **a second** `checkRateLimit()` inside the route handler — resulting in **two sequential Upstash Redis REST round-trips** per request just for rate limiting.
- **Impact:** Adds ~50–250ms per API request (and multiplies when regions aren't aligned).
- **Fix:**
  - Do not rate-limit read-only CDN-cacheable GET endpoints (`/api/settings/pixel`, `/api/products`, `/api/categories`, `/api/store/products`, `/api/blogs`) or `/api/auth/session` synchronously in Edge middleware (let Vercel Edge CDN + `s-maxage` absorb read traffic).
  - Deduplicate rate limiting so auth/order/chat mutations check Redis **once** instead of in both `proxy.ts` and the route handler.

---

#### P-05. Region Mismatch (`iad1` US East vs Bangladesh Target Audience)
- **Files:** `vercel.json` (line 2: `"regions": ["iad1"]`)
- **What happens:** All serverless functions are pinned to `iad1` (Washington, D.C., USA), while the store serves customers in Bangladesh (`Chattogram`, `Dhaka`, `+06:00`).
- **Impact:** Dynamic/uncached API requests (checkout, tracking, auth, search, cart sync, pixel, size guide) incur ~230–350ms network round-trip latency between Bangladesh and US East **before** server processing, plus additional cross-region RTT if MongoDB Atlas or Upstash Redis is hosted in Asia (`ap-south-1` Mumbai / `ap-southeast-1` Singapore).
- **Fix:** Align Vercel function region (`bom1` Mumbai or `sin1` Singapore) with the MongoDB Atlas and Upstash Redis region to cut dynamic API and DB RTTs by 50–75%.

---

### 🟠 High-Impact Issues (Slow Interactions, Bundle Bloat & Stale/Missing Caches)

#### P-06. Artificial 600ms Delay on "Add to Cart" Button
- **File:** `src/components/ui/product-card-rimon.tsx` (lines 64–65)
- **Code observed:**
  ```ts
  setIsAdding(true);
  await new Promise(resolve => setTimeout(resolve, 600));
  addItem({ ... });
  ```
- **Impact:** Every single "Add to Cart" click on homepage and shop cards forcibly freezes the interaction for 600ms before updating the cart and opening `CartDrawer`.
- **Fix:** Remove the `setTimeout(resolve, 600)` sleep and update cart state immediately (0ms).

---

#### P-07. Global Swiper CSS Bundled on Every Page (Unused Component)
- **Files:**
  - `src/app/globals.css` (lines 5–8: `@import "swiper/css"`, `effect-fade`, `pagination`, `navigation`)
  - `src/components/sections/HeroSlider.tsx` (not imported anywhere in `src/`)
- **Impact:** Render-blocking CSS for Swiper is compiled into the global stylesheet loaded on every page even though `HeroSlider` is never used.
- **Fix:** Remove the 4 Swiper `@import` lines from `globals.css` (or scope them strictly to `HeroSlider.tsx` if ever re-enabled).

---

#### P-08. Scroll Hijacking & Continuous RAF Tickers on Every Page (`LenisProvider` + `AnimatedReveal`)
- **Files:**
  - `src/components/providers/LenisProvider.tsx` (lines 24–52)
  - `src/components/ui/AnimatedReveal.tsx` (lines 31–90)
  - `src/components/layout/Footer.tsx` (line 133)
  - `src/components/sections/Homepage.tsx` (lines 97, 163, 178, 217, 261, 302, 331, 355, 372)
  - `src/app/layout.tsx` (line 78: `data-scroll-behavior="smooth"`)
- **What happens:**
  - `LenisProvider` wraps the entire app (`RootLayout`), downloads `lenis` + `gsap` + `ScrollTrigger` on desktop, and registers a continuous `gsap.ticker` callback (`gsap.ticker.lagSmoothing(0)`) running on every animation frame and intercepting wheel scrolling.
  - Meanwhile, `AnimatedReveal` is rendered ~12+ times on the homepage and inside the global `Footer`, each executing `await import("@/lib/gsap")` inside `useEffect` and registering/scanning `ScrollTrigger.getAll()` on cleanup.
  - `FramerMotionProvider` also wraps the entire app in `RootLayout` and eagerly loads `framer-motion`'s `domAnimation` bundle globally.
- **Impact:** Heavy JS evaluation (`gsap` + `lenis` + `framer-motion`), perceived wheel-scroll lag/heaviness on desktop, and unnecessary main-thread work on every route.
- **Fix:**
  - Use native CSS/browser scrolling (remove `LenisProvider` from global storefront routes unless specifically needed for a showcase page).
  - Replace `AnimatedReveal` GSAP `ScrollTrigger` wrappers with lightweight CSS transitions triggered by a single shared `IntersectionObserver` (eliminating `gsap` completely from the storefront critical/post-load bundle).

---

#### P-09. Unoptimized & Uncached Database Endpoints & Queries
| Endpoint / Page | Issue Observed | File & Line |
|-----------------|---------------|-------------|
| `GET /api/blogs` | No Redis cache, no `.limit()`, fetches full markdown `content` for every post | `src/app/api/blogs/route.ts:12-14` |
| `GET /api/blogs/[slug]` & `/blogs/[slug]` | No Redis cache; hits MongoDB directly on every miss/revalidation | `src/app/api/blogs/[slug]/route.ts:18`, `src/app/(main)/blogs/[slug]/page.tsx:14-15` |
| `GET /api/settings/size-guide` | Called on every product page mount (`ProductDetailsClient.tsx:66`); no Redis cache, no `revalidate`, no `.lean()`, fetches full `Settings` doc | `src/app/api/settings/size-guide/route.ts:10`, `src/components/product/ProductDetailsClient.tsx:66` |
| `GET /api/settings/shipping` | Called on checkout mount; queries MongoDB directly instead of using `getCachedShipping` | `src/app/api/settings/shipping/route.ts:10-11` |
| `GET /api/settings/pixel` | Called on every page load; queries MongoDB directly instead of using `getCachedPixel` | `src/app/api/settings/pixel/route.ts:10-11` |
| `GET /api/products/last-updated` | Reads MongoDB `Counter` collection via `connectToDatabase()` instead of Redis | `src/lib/lastUpdated.ts:28-36` |
| Category filter aggregations | `$lookup` on `categories` runs **before** `$match: { isPublished: true }` across `/api/products`, `/api/store/products`, and `/api/v1/products`, forcing collection-wide joins instead of filtering `isPublished: true` first or resolving `Category._id` first | `src/app/api/products/route.ts:64-79`, `src/app/api/store/products/route.ts:53-68`, `src/app/api/v1/products/route.ts:80-90` |
| `GET /api/store/products/[slug]` | No Redis caching; populates 4 paths on every miss | `src/app/api/store/products/[slug]/route.ts:26-37` |
| `sitemap.ts` | No `revalidate` export or cache; queries all products, blogs, and categories directly from MongoDB | `src/app/sitemap.ts:36-51` |

---

#### P-10. Serverless Cache Write-Through Race & Cache Key Mismatches
- **Files:**
  - `src/lib/cache/redis-cache.ts` (lines 147–150)
  - `src/app/(main)/products/page.tsx` (line 14)
  - `src/lib/cache/invalidation.ts` (lines 31, 56–58, 73–95)
  - `src/app/api/admin/settings/shipping/route.ts` (line 6)
  - `src/app/api/blogs/route.ts` & `src/app/api/blogs/[slug]/route.ts`
- **What happens:**
  1. `getOrSetCached()` executes `setCached(key, value, ttl).catch(...)` **without `await`** or `after()` from `next/server`. On serverless platforms (Vercel), returning a response freezes/terminates unawaited async work, so cache writes may be dropped and cache misses repeat.
  2. `src/app/(main)/products/page.tsx` caches under `'products:isr:list:48'`, while `invalidation.ts` deletes `KEYS.productsIsrList()` (`'cache:products:isr:list'`) and `api/admin/products/[id]/route.ts` deletes `'cache:products:*'`. As a result, `'products:isr:list:48'` is **never invalidated** on product edits.
  3. `api/store/products/route.ts` writes `'cache:products:legacy:...'`, which is not matched by `invalidateProduct()` (`cache:api:products:*`, `cache:products:v1:*`, `cache:product:isr:*`).
  4. `api/admin/settings/shipping/route.ts` imports `invalidateSettings` on line 6 and never calls it in `PUT`.
  5. `api/blogs` (`POST`) and `api/blogs/[slug]` (`PATCH`/`DELETE`) never invalidate `'cache:blogs:listing'` or call `revalidatePath('/blogs')`.

---

#### P-11. Synchronous Blocking Operations in Checkout & Order Creation
- **Files:**
  - `src/app/api/store/orders/route.ts` (lines 281–328)
  - `src/app/api/v1/orders/route.ts` (lines 127–180)
- **What happens:**
  - `POST /api/store/orders` loops sequentially over all uploaded customer photos (`for (let i = 0; i < preparedPhotos.length; i++)`) and `await`s each Google Drive folder lookup/creation and file upload synchronously before returning `201 Created`. Each photo can be up to 15 MB (`MAX_PHOTO_SIZE_BYTES`), easily exceeding Vercel's 15-second `maxDuration` (`vercel.json:5`).
  - `POST /api/v1/orders` synchronously awaits `Promise.allSettled` for PDF invoice rendering (`@react-pdf/renderer`) + Cloudinary upload + Nodemailer SMTP + Telegram HTTP + Google Sheets API + Meta CAPI HTTP before returning a response.

---

### 🟡 Medium-Impact Issues (Rendering, Assets & Dead Code)

#### P-12. Oversized Static Media Assets & Unused Files in `public/` & `src/`
- **Observed file sizes in `public/`:**
  - `public/video/hero-bg.mp4`: **25.28 MB (`25,891,146` bytes)** — unused in active routes, bloats repo/deployments.
  - `public/lottie/ai.json`: **4.69 MB (`4,804,302` bytes)** — active bottleneck in `Chatbot.tsx`.
  - `public/images/hero-bg-mobile.png`: **796.68 KB (`815,805` bytes)** — unreferenced PNG.
  - `public/images/mobile-app-image.png`: **514.98 KB (`527,337` bytes)** — `AppDownloadSection.tsx` returns `null`.
  - `public/images/hero-bg.jpg`: **465.83 KB (`477,014` bytes)** — active desktop hero background; could be converted/compressed to WebP/AVIF (<120 KB).
- **Unused/dead client components imported or left in tree:**
  - `QuickLookDrawer.tsx` is dynamically loaded via `GlobalUI.tsx:9,44`, yet `openQuickLook` is never called anywhere in `src/`.
  - `TopNavbar.tsx` attaches a scroll listener calling `setScrolled` + `backdropFilter: blur(12px)` on a fixed header (`src/components/layout/TopNavbar.tsx:65-69,104`).
  - `ProductDetailsClient.tsx` passes raw `img.url` to `<Image>` without `getOptimizedCloudinaryUrl()` (`src/components/product/ProductDetailsClient.tsx:237,247,296`) and loads `@headlessui/react` + `framer-motion` eagerly.
  - `src/app/(main)/page.tsx` uses `JSON.parse(JSON.stringify(...))` after `.lean()` and fetches `10` categories while `Homepage.tsx:177` slices only `5` (`categories.slice(0, 5)`).

---

#### P-13. Quality/Build Debt Affecting Optimization
- `next.config.ts:33` sets `typescript: { ignoreBuildErrors: true }`.
- `npm run lint` currently fails with **2 ESLint errors and 144 warnings**:
  - `src/app/(dashboard)/admin/page.tsx:36` (`react-hooks/error-boundaries`: constructing JSX inside `try/catch`)
  - `src/types/react-jsx.d.ts:1` (`@typescript-eslint/triple-slash-reference`)

---

## 3. Recommended Optimization Action Plan (Priority Order)

1. **Immediate (Minutes — Massive Gain):**
   - Replace `public/lottie/ai.json` import in `Chatbot.tsx` with `ai-icon2.json` (`8.7 KB`) or SVG, and load `Chatbot` in `GlobalUI.tsx` **on click** instead of `mousemove`/`scroll`.
   - Remove the 600ms `setTimeout` in `src/components/ui/product-card-rimon.tsx:65`.
   - Stop `SearchDrawer.tsx` from calling `fetch("/api/store/products?limit=4")` on mount when closed; defer until `isOpen === true`.
   - Remove unused Swiper `@import` lines from `src/app/globals.css`.
2. **High Priority (Backend & Edge Latency):**
   - Move `await connectToDatabase()` inside cache-miss callbacks across `/api/products`, `/api/store/products`, `/api/categories`, `/api/store/categories`, `/api/v1/*`.
   - Add Redis caching (`getCachedPixel`, `getCachedShipping`, `getOrSetCached`) to `/api/settings/pixel`, `/api/settings/shipping`, `/api/settings/size-guide`, `/api/blogs`, `/api/blogs/[slug]`, and `/api/store/products/[slug]`, and fix `setCached` persistence with `await` or Next.js `after()`.
   - Remove synchronous Upstash rate-limit calls in `src/proxy.ts` for read-only public GET routes and eliminate double rate-limiting on mutations.
   - Align `vercel.json` region (`bom1` or `sin1`) with MongoDB Atlas & Upstash Redis cluster regions.
   - Fix cache invalidation key mismatches (`products:isr:list:48`, `cache:blogs:listing`, `cache:products:legacy:*`, `invalidateSettings()` in `shipping/route.ts`).
3. **Medium Priority (Smoothness & Payload):**
   - Remove `LenisProvider` from global storefront layout and replace `AnimatedReveal` GSAP instances with CSS + a single shared `IntersectionObserver`.
   - Defer Google Drive photo uploads / email / PDF generation off the critical response path using `after()` (Next.js 15/16) or background queues, and optimize `hero-bg.jpg`.
   - Remove unused `QuickLookDrawer` from `GlobalUI.tsx` and unused media files (`hero-bg.mp4`, `hero-bg-mobile.png`, `mobile-app-image.png`) from `public/`.
