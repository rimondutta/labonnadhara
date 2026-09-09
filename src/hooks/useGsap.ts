/**
 * Custom hook for safe GSAP usage in React components.
 * Handles cleanup and SSR safety automatically.
 */
"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * useGsapContext — creates a GSAP context scoped to a container ref.
 * All animations created inside the callback are automatically cleaned up.
 */
export function useGsapContext(
  callback: (ctx: gsap.Context, container: HTMLElement) => void,
  deps: React.DependencyList = []
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      callback(ctx!, containerRef.current!);
    }, containerRef);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

/**
 * useScrollReveal — adds a scroll-triggered reveal animation to elements
 * matching the given selector inside the container ref.
 */
export function useScrollReveal(
  selector: string,
  options: {
    y?: number;
    x?: number;
    opacity?: number;
    scale?: number;
    rotation?: number;
    stagger?: number;
    duration?: number;
    delay?: number;
    ease?: string;
    start?: string;
    scrub?: boolean | number;
  } = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const {
      y = 80,
      x = 0,
      opacity = 0,
      scale = 1,
      rotation = 0,
      stagger = 0.15,
      duration = 1.4,
      delay = 0,
      ease = "power4.out",
      start = "top 85%",
      scrub = false,
    } = options;

    const ctx = gsap.context(() => {
      const elements = containerRef.current!.querySelectorAll(selector);

      gsap.set(elements, { y, x, opacity, scale, rotation });

      ScrollTrigger.batch(elements, {
        onEnter: (batch) => {
          gsap.to(batch, {
            y: 0,
            x: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
            stagger,
            duration,
            delay,
            ease,
            overwrite: true,
          });
        },
        start,
      });
    }, containerRef);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return containerRef;
}

/**
 * useParallax — adds parallax scrolling to an element.
 */
export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        y: () => speed * 200,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    });

    return () => ctx.revert();
  }, [speed]);

  return ref;
}

export { gsap, ScrollTrigger };
