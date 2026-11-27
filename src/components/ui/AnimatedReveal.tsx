"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AnimatedRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "none";
}

/**
 * GSAP ScrollTrigger reveal wrapper — GPU-composited, zero Framer Motion overhead.
 * Respects prefers-reduced-motion: falls back to an instant opacity reveal.
 *
 * Performance note: Elements start VISIBLE (no opacity:0 on mount).
 * GSAP immediately re-hides them synchronously once it loads, preventing
 * flash of invisible content (FOIC) during the async import.
 */
export default function AnimatedReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: AnimatedRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Track whether GSAP has taken control — prevents double-animation on StrictMode
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || animated.current) return;
    animated.current = true;

    // Respect user motion preference
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // Leave visible — no animation for reduced-motion users

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await import("@/lib/gsap");

      // Check if element is already in view — if so, animate immediately
      const rect = el.getBoundingClientRect();
      const alreadyVisible = rect.top < window.innerHeight * 0.9;

      // Initial hidden state — use transform3d to hit the GPU compositor
      const fromVars: gsap.TweenVars = {
        opacity: 0,
        force3D: true,
        ...(direction === "up" ? { y: 24 } : direction === "left" ? { x: 24 } : {}),
      };
      gsap.set(el, fromVars);

      const tween = gsap.to(el, {
        opacity: 1,
        y: 0,
        x: 0,
        duration: 0.6,
        delay: alreadyVisible ? 0 : delay,
        ease: "power2.out",
        // willChange is applied automatically by GSAP during the tween and
        // cleared afterwards via clearProps — no need to set it on init
        // (pre-promoting many off-screen elements wastes GPU VRAM)
        clearProps: "willChange,transform",
        ...(alreadyVisible ? {} : {
          scrollTrigger: {
            trigger: el,
            start: "top 92%",
            once: true,
          },
        }),
      });

      cleanup = () => {
        tween.kill();
        if (!alreadyVisible) {
          ScrollTrigger.getAll()
            .filter((st: any) => st.vars?.trigger === el)
            .forEach((st: any) => st.kill());
        }
      };
    })();

    return () => cleanup?.();
  }, [delay, direction]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
