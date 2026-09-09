import type { Metadata } from "next";
import { Poppins, DM_Sans, Manrope } from "next/font/google";
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

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-poppins",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"],
  variable: "--font-dm-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://toyhourse.com'),
  title: {
    default: "Toy Hourse — Toys They'll Actually Play With Twice",
    template: "%s | Toy Hourse",
  },
  description:
    "Endlessly fun, safety-tested toys for curious kids aged 0–10.",
  openGraph: {
    title: "Toy Hourse — Toys They'll Actually Play With Twice",
    description: "Endlessly fun, safety-tested toys for curious kids aged 0–10.",
    type: "website",
    locale: "en_US",
    siteName: "Toy Hourse",
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://toyhourse.com',
  },
  twitter: {
    card: "summary_large_image",
    title: "Toy Hourse — Toys They'll Actually Play With Twice",
    description: "Endlessly fun, safety-tested toys for curious kids aged 0–10.",
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
      className={`${poppins.variable} ${dmSans.variable} ${manrope.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
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
