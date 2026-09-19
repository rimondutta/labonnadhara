import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "@/components/providers/CartProvider";
import { WishlistProvider } from "@/components/providers/WishlistProvider";
import SearchProvider from "@/components/providers/SearchProvider";
import GlobalUI from "@/components/layout/GlobalUI";
import NextAuthProvider from "@/components/providers/NextAuthProvider";
import { ToastProvider } from "@/components/playshelf/Toast";
import FacebookPixel from "@/components/FacebookPixel";
import ExtensionHydrationFix from "@/components/ExtensionHydrationFix";
import LenisProvider from "@/components/providers/LenisProvider";
import FramerMotionProvider from "@/components/providers/FramerMotionProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-poppins",
  display: "swap",
});



export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://labonnadhara.com'),
  title: {
    default: "Labonnadhara — Premium Jewelry & Lifestyle",
    template: "%s | Labonnadhara",
  },
  description:
    "Elegant, timeless jewelry crafted for your everyday style and special moments.",
  openGraph: {
    title: "Labonnadhara — Premium Jewelry & Lifestyle",
    description: "Elegant, timeless jewelry crafted for your everyday style and special moments.",
    type: "website",
    locale: "en_US",
    siteName: "Labonnadhara",
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://labonnadhara.shop',
  },
  twitter: {
    card: "summary_large_image",
    title: "Labonnadhara — Toys They'll Actually Play With Twice",
    description: "Endlessly fun, safety-tested toys for curious kids aged 0–10.",
  },
  verification: {
    google: "cN9MpMpdVbMEnDhHrc7E670jqvrh4tO5U9bj3zUg1EY",
  },
};

export const links = [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${playfair.variable} ${poppins.variable}`}
    >
      <head>
        {/* Preload LCP hero images — browser discovers them during HTML parse, before JS hydration */}
        <link
          rel="preload"
          as="image"
          href="/images/hero-bg.jpg"
          // @ts-ignore — fetchpriority is valid HTML5 but not yet in all TS typings
          fetchPriority="high"
          media="(min-width: 641px)"
        />
        <link
          rel="preload"
          as="image"
          href="/images/mobile-hero-bg.jpg"
          // @ts-ignore
          fetchPriority="high"
          media="(max-width: 640px)"
        />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-NWR9G1FPB6"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-NWR9G1FPB6');
          `}
        </Script>
        <Script
          id="extension-attribute-cleaner"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;
                var clean = function(node) {
                  if (node && node.removeAttribute) {
                    if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                    if (node.hasAttribute('bis_status')) node.removeAttribute('bis_status');
                  }
                };
                var observer = new MutationObserver(function(mutations) {
                  for (var i = 0; i < mutations.length; i++) {
                    var m = mutations[i];
                    if (m.type === 'attributes') {
                      clean(m.target);
                    } else if (m.type === 'childList') {
                      for (var j = 0; j < m.addedNodes.length; j++) {
                        var node = m.addedNodes[j];
                        clean(node);
                        if (node.querySelectorAll) {
                          var children = node.querySelectorAll('[bis_skin_checked],[bis_status]');
                          for (var k = 0; k < children.length; k++) clean(children[k]);
                        }
                      }
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  attributes: true,
                  subtree: true,
                  childList: true,
                  attributeFilter: ['bis_skin_checked', 'bis_status']
                });
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="relative min-h-screen flex flex-col bg-joy-cream text-joy-navy font-body selection:bg-joy-cobalt selection:text-joy-cream overflow-x-hidden"
      >
        <NextAuthProvider>
          <WishlistProvider>
            <CartProvider>
              <SearchProvider>
                <ToastProvider>
                  <ExtensionHydrationFix />
                  <FramerMotionProvider>
                    <LenisProvider>
                      {children}
                      <GlobalUI />
                    </LenisProvider>
                  </FramerMotionProvider>
                  <FacebookPixel />
                </ToastProvider>
              </SearchProvider>
            </CartProvider>
          </WishlistProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
