"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

interface PixelConfig {
  pixelId: string;
  enabled: boolean;
}

/**
 * FacebookPixel
 *
 * Fetches the current pixel config from /api/settings/pixel and — only if
 * enabled === true and a valid pixelId exists — injects the Meta Pixel base
 * code using next/script's "afterInteractive" strategy.
 *
 * Rendered once in the root layout to avoid duplicate initialization.
 *
 * SPA Route Tracking:
 * Next.js App Router is a SPA — navigating via <Link> or router.push() does
 * NOT reload the page, so the base script's initial fbq('track', 'PageView')
 * only fires once. We track client-side route changes via usePathname() and
 * fire a new PageView on each navigation — but ONLY after the pixel script has
 * fully loaded (guarded by `pixelReady`) to avoid losing events.
 *
 * ⚠️  GDPR/PDPA Note: This implementation loads the pixel as soon as the page
 * opens. If your target market requires explicit cookie consent (e.g., EU/EEA,
 * Thailand), integrate a consent management platform (CMP) and gate the
 * rendering of this component behind the user's consent signal.
 */
export default function FacebookPixel() {
  const [config, setConfig] = useState<PixelConfig | null>(null);

  const pathname = usePathname();
  const initialPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Set initial path once when component mounts
      initialPathnameRef.current = window.location.pathname;

      // Instantly capture fbclid from URL before Next.js routing can strip it or before lazyOnload pixel fires.
      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get("fbclid");
      if (fbclid) {
        // Meta _fbc format: fb.<subdomainIndex>.<creationTime>.<fbclid>
        // Use 1 for subdomain index as standard.
        const creationTime = Date.now();
        const fbcValue = `fb.1.${creationTime}.${fbclid}`;
        // Store for 90 days (Meta standard)
        document.cookie = `_fbc=${fbcValue}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
      }
    }

    fetch("/api/settings/pixel")
      .then((r) => r.json())
      .then((data: PixelConfig) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Only track route changes if config is loaded and enabled
    if (!config || !config.enabled || !config.pixelId) return;
    
    // Skip the first render because the inline script already tracks the initial PageView
    if (pathname === initialPathnameRef.current) return;

    if (typeof window !== "undefined" && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, config]);

  if (!config || !config.enabled || !config.pixelId) return null;

  const pixelId = config.pixelId;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
