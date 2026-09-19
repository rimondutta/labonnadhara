"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function LenisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    let rafCallback: ((time: number) => void) | null = null;
    let gsapInstance: any = null;

    // Dynamically import GSAP to prevent it from blocking the main thread on page load
    import("@/lib/gsap").then(({ gsap, ScrollTrigger }) => {
      gsapInstance = gsap;
      
      // Keep ScrollTrigger in sync with Lenis scroll position
      lenis.on("scroll", ScrollTrigger.update);

      // Single RAF source: GSAP ticker drives Lenis (no autoRaf)
      rafCallback = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);
    });

    return () => {
      if (gsapInstance && rafCallback) {
        gsapInstance.ticker.remove(rafCallback);
      }
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

