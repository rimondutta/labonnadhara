import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

// unsafe-eval is required by Next.js dev server (Turbopack/HMR) but must
// never appear in the production policy.
const scriptSrcDevExtra = isDev ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  // Pin root directory to prevent Next.js from detecting stray package-lock.json in parent folders
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },

  // Prevent Next.js from bundling @react-pdf/renderer with webpack.
  // It relies on Node.js built-ins and must run as a server external.
  serverExternalPackages: ["@react-pdf/renderer"],

  // Remove the X-Powered-By header to reduce response payload size.
  poweredByHeader: false,

  // Enable gzip/brotli compression for all responses.
  compress: true,

  // Allow development from 127.0.0.1 for HMR and Studio
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  typescript: {
    // Type errors must be fixed before shipping — do not ignore them.
    ignoreBuildErrors: false,
  },

  // Compiler optimizations for production performance
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  images: {
    // Serve AVIF first (smallest), fallback to WebP — ~30-40% smaller than JPEG/PNG.
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 1 year at the CDN edge.
    minimumCacheTTL: 31536000,
    // Mobile-first device breakpoints — smaller steps at mobile end for better srcset matching.
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
    // Thumbnail / icon sizes used in product cards, avatars, category circles.
    imageSizes: [16, 32, 48, 64, 96, 128, 176, 256],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.facebook.com" },
    ],
  },

  async headers() {
    return [
      // -----------------------------------------------------------------------
      // Static asset caching — no CORS headers needed for same-origin assets
      // -----------------------------------------------------------------------
      {
        source: "/(images|icons|logo)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // -----------------------------------------------------------------------
      // Global security headers — applied to every route
      // -----------------------------------------------------------------------
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            // Notes:
            //   • unsafe-eval is omitted in production; dev adds it for HMR/Turbopack.
            //   • unsafe-inline for scripts is required by Next.js inline scripts and
            //     third-party tags (GA, FB Pixel). Nonce-based CSP requires significant
            //     infrastructure changes and is tracked as a future improvement.
            //   • report-uri sends violations to our own logging endpoint.
            value: [
              "default-src 'self'",
              `script-src 'self'${scriptSrcDevExtra} 'unsafe-inline' https://connect.facebook.net https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com`,
              "worker-src 'self' blob:",
              "child-src 'self' blob: https://www.facebook.com",
              "frame-src 'self' https://www.facebook.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://www.facebook.com https://lh3.googleusercontent.com https://i.pravatar.cc https://*.fbcdn.net https://*.facebook.com https://www.google-analytics.com https://www.googletagmanager.com",
              "connect-src 'self' https://api.telegram.org https://www.facebook.com https://res.cloudinary.com https://api.cloudinary.com https://www.google-analytics.com https://region1.google-analytics.com https://api.openai.com https://analytics.google.com https://*.on.aws https://*.run.app https://cloudflareinsights.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https://www.facebook.com",
              "report-uri /api/csp-report",
            ].join("; "),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // /shop → /products (permanent SEO redirect)
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
      // /shop?* → /products (preserve query string)
      {
        source: "/shop",
        has: [{ type: "query", key: "category" }],
        destination: "/products?category=:category",
        permanent: true,
      },
      // /product/:slug → /products/:slug
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
