"use client";

import React, { useEffect, useRef } from "react";

export default function HeroAnimationWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const heroRef = useRef<HTMLDivElement>(null);

  // GSAP hero entrance — enhances visibility, does NOT gate it
  // Hero items are visible by default (no opacity:0); GSAP adds a subtle slide-up
  useEffect(() => {
    const ctx = (async () => {
      const { gsap } = await import("@/lib/gsap");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const hero = heroRef.current;
      if (!hero || reduced) return null;

      const items = hero.querySelectorAll<HTMLElement>("[data-hero-item]");
      if (items.length > 0) {
        gsap.set(items, { y: 20, force3D: true });
        const tl = gsap.timeline();
        tl.to(items, {
          y: 0,
          duration: 0.65,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "will-change,transform",
        });
        return tl;
      }
      return null;
    })();

    return () => { ctx.then(tl => tl?.kill()); };
  }, []);

  return (
    <div ref={heroRef} className={className}>
      {children}
    </div>
  );
}
