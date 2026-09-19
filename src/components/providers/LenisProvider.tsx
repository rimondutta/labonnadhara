"use client";

import { useEffect } from "react";

export default function LenisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    // Fully deferred: Lenis + GSAP are dynamically imported so they never
    // appear in the initial bundle — eliminating their TBT contribution.
    Promise.all([
      import("lenis"),
      import("@/lib/gsap"),
    ]).then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical" as const,
        gestureOrientation: "vertical" as const,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });

      // Keep ScrollTrigger in sync with Lenis scroll position
      lenis.on("scroll", ScrollTrigger.update);

      // Single RAF source: GSAP ticker drives Lenis
      const rafCallback = (time: number) => {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(rafCallback);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(rafCallback);
        lenis.destroy();
      };
    });

    return () => {
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
