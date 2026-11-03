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
 * enabled === true and a valid numeric pixelId exists — injects the Meta Pixel base
 * code using next/script's "lazyOnload" strategy.
 *
 * Security: Validates pixelId against a strict numeric regex (/^\d{5,20}$/) to prevent
 * stored XSS injection via database settings into dangerouslySetInnerHTML, and embeds
 * the value safely using JSON.stringify.
 */
export default function FacebookPixel() {
  const [config, setConfig] = useState<PixelConfig | null>(null);

  const pathname = usePathname();
  const initialPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      initialPathnameRef.current = window.location.pathname;

      const urlParams = new URLSearchParams(window.location.search);
      const fbclid = urlParams.get("fbclid");
      if (fbclid) {
        const creationTime = Date.now();
        const fbcValue = `fb.1.${creationTime}.${fbclid}`;
        document.cookie = `_fbc=${fbcValue}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
      }
    }

    fetch("/api/settings/pixel")
      .then((r) => r.json())
      .then((data: PixelConfig) => setConfig(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!config || !config.enabled || !config.pixelId) return;
    if (pathname === initialPathnameRef.current) return;

    if (typeof window !== "undefined" && (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq) {
      (window as unknown as { fbq: (...args: unknown[]) => void }).fbq("track", "PageView");
    }
  }, [pathname, config]);

  // Strict numeric validation (5-20 digits). If invalid, render nothing.
  const safePixelId = config?.pixelId && /^\d{5,20}$/.test(config.pixelId.trim())
    ? config.pixelId.trim()
    : null;

  if (!config || !config.enabled || !safePixelId) return null;

  const serializedPixelId = JSON.stringify(safePixelId);

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
            fbq('init', ${serializedPixelId});
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(safePixelId)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
