"use client";

import { useEffect } from "react";

export default function LenisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let initialized = false;

    const init = () => {
      if (initialized) return;
      initialized = true;
      // Remove event listeners once initialized
      window.removeEventListener("scroll", init);
      window.removeEventListener("touchstart", init);
      window.removeEventListener("mousemove", init);

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

        lenis.on("scroll", ScrollTrigger.update);

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
    };

    // Defer to first user interaction — keeps main thread idle during Lighthouse cold start
    window.addEventListener("scroll", init, { once: true, passive: true });
    window.addEventListener("touchstart", init, { once: true, passive: true });
    window.addEventListener("mousemove", init, { once: true, passive: true });
    // Fallback: initialize after 4 seconds even without interaction
    const fallback = setTimeout(init, 4000);

    return () => {
      clearTimeout(fallback);
      window.removeEventListener("scroll", init);
      window.removeEventListener("touchstart", init);
      window.removeEventListener("mousemove", init);
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
