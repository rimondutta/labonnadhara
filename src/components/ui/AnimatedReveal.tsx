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
 */
export default function AnimatedReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: AnimatedRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect user motion preference
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap, ScrollTrigger } = await import("@/lib/gsap");

      if (reduced) {
        gsap.set(el, { opacity: 0 });
        gsap.to(el, { opacity: 1, duration: 0.15, delay });
        return;
      }

      // Initial hidden state — use transform3d to hit the GPU compositor
      const fromVars: gsap.TweenVars = {
        opacity: 0,
        force3D: true,
        ...(direction === "up" ? { y: 36 } : direction === "left" ? { x: 36 } : {}),
      };
      gsap.set(el, fromVars);

      const tween = gsap.to(el, {
        opacity: 1,
        y: 0,
        x: 0,
        duration: 0.75,
        delay,
        ease: "power3.out",
        // willChange is applied automatically by GSAP during the tween and
        // cleared afterwards via clearProps — no need to set it on init
        // (pre-promoting many off-screen elements wastes GPU VRAM)
        clearProps: "willChange,transform",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          once: true,
        },
      });

      cleanup = () => {
        tween.kill();
        ScrollTrigger.getAll()
          .filter((st: any) => st.vars?.trigger === el)
          .forEach((st: any) => st.kill());
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
