import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js from bundling @react-pdf/renderer with webpack.
  // It relies on Node.js built-ins and must run as a server external.
  serverExternalPackages: ['@react-pdf/renderer'],

  // Remove the X-Powered-By header to reduce response payload size.
  poweredByHeader: false,

  // Enable gzip/brotli compression for all responses.
  compress: true,

  // Allow development from 127.0.0.1 for HMR and Studio
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },

  images: {
    // Serve AVIF first (smallest), fallback to WebP — ~30-40% smaller than JPEG/PNG.
    formats: ['image/avif', 'image/webp'],
    // Cache optimized images for 1 year at the CDN edge.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },

  experimental: {
    // Tree-shake these large packages to only import what is actually used.
    // Fixes "Reduce unused JavaScript" and "Legacy JavaScript" PageSpeed issues.
    optimizePackageImports: [
      'framer-motion',
      'lucide-react',
      '@tabler/icons-react',
      'swiper',
      'react-icons',
      '@heroicons/react',
      'gsap',
    ],
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.MOBILE_ORIGIN || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://connect.facebook.net",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://picsum.photos https://fastly.picsum.photos https://www.facebook.com https://lh3.googleusercontent.com https://i.pravatar.cc",
              "connect-src 'self' https://api.telegram.org https://www.facebook.com https://res.cloudinary.com https://api.cloudinary.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
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
