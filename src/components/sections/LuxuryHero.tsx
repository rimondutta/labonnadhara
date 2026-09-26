"use client";

import React, { useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

/* ══════════════════════════════════════════════════════════════════
   FRAME SEQUENCE — 115 frames, scroll-scrubbed like an Apple film
   ══════════════════════════════════════════════════════════════════

   Architecture:
   - Outer div is 600vh tall  → provides scroll distance
   - Inner div is CSS sticky (100vh) → stays in view while user scrolls
   - GSAP ScrollTrigger (NO pin) reads scroll progress → picks frame
   - Canvas renders each frame with cover-fit scaling
   - Lenis is already running site-wide; ScrollTrigger is synced to it
     via lenis.on("scroll", ScrollTrigger.update) in LenisProvider.
*/

/* ── Frame list (skips missing 111 & 116 by remapping) ─────────── */
const FRAME_NUMS: number[] = (() => {
  const out: number[] = [];
  for (let i = 1; i <= 115; i++) {
    if (i === 111) { out.push(112); continue; }
    if (i === 116) { out.push(117); continue; }
    out.push(i);
  }
  return out;
})();
const TOTAL_FRAMES = FRAME_NUMS.length;

function frameUrl(n: number) {
  return `/images/hero-bg_frames/hero-bg_frames/frame_${String(n).padStart(3, "0")}.jpg`;
}

/* ── Hairline ─────────────────────────────────────────────── */
function GoldHairline({
  className = "",
  vertical = false,
  style,
}: {
  className?: string;
  vertical?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={className}
      style={
        vertical
          ? {
            width: "1px",
            background:
              "linear-gradient(180deg,transparent 0%,rgba(244,184,198,.55) 25%,rgba(244,184,198,.55) 75%,transparent 100%)",
            ...style,
          }
          : {
            height: "1px",
            background:
              "linear-gradient(90deg,transparent,rgba(244,184,198,.7) 30%,rgba(255,255,255,.85) 60%,transparent)",
            ...style,
          }
      }
    />
  );
}

/* ── Masked headline ───────────────────────────────────────────── */
function HeadlineReveal({ lines }: { lines: string[] }) {
  return (
    <h1
      className="font-serif leading-[1.05] tracking-[-0.02em] lhero-headline"
      aria-label={lines.join(" ")}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden" style={{ paddingBottom: "0.05em" }}>
          <span className="block" data-lhero-line>
            {line}
          </span>
        </span>
      ))}
    </h1>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */
export default function LuxuryHero() {
  /* Refs ──────────────────────────────────────────────────── */
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlineRef = useRef<HTMLParagraphElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const frameCounterRef = useRef<HTMLSpanElement>(null);
  const metaRef0 = useRef<HTMLParagraphElement>(null);
  const metaRef1 = useRef<HTMLParagraphElement>(null);
  const metaRef2 = useRef<HTMLParagraphElement>(null);

  /* Frame images ──────────────────────────────────────────── */
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>(new Array(TOTAL_FRAMES).fill(false));
  const currentIdxRef = useRef(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null); // cached context
  const rafRef = useRef<number | null>(null); // pending rAF id

  /* ── Draw a frame onto the canvas ───────────────────────── */
  const drawFrame = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const i = Math.max(0, Math.min(Math.round(idx), TOTAL_FRAMES - 1));
    const img = imagesRef.current[i];
    if (!img || !loadedRef.current[i]) {
      // Try previous loaded frame instead of blank
      for (let back = i - 1; back >= 0; back--) {
        if (loadedRef.current[back]) {
          return drawFrame(back);
        }
      }
      return;
    }
    currentIdxRef.current = i;
    // Lazy-init context once and cache it to avoid expensive re-creation
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext("2d", { alpha: false, willReadFrequently: false }) as CanvasRenderingContext2D | null;
    }
    const ctx = ctxRef.current;
    if (!ctx) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.drawImage(img, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
    if (frameCounterRef.current) {
      frameCounterRef.current.textContent = String(i + 1).padStart(3, "0");
    }
  }, []);

  /* ── Fit canvas to viewport ─────────────────────────────── */
  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Reset cached context when canvas dimensions change (required by canvas spec)
    ctxRef.current = null;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawFrame(currentIdxRef.current);
  }, [drawFrame]);

  /* ── Main effect ─────────────────────────────────────────── */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 1 ─ Size canvas */
    fitCanvas();
    window.addEventListener("resize", fitCanvas, { passive: true });

    /* 2 ─ Preload logic: Prioritize frame 0 for instant load, chunk the rest */
    let firstDrawn = false;
    
    const loadImg = (idx: number, isFirst: boolean = false, cb?: () => void) => {
      const img = new window.Image();
      if (isFirst && "fetchPriority" in img) {
        (img as any).fetchPriority = "high";
      }
      img.src = frameUrl(FRAME_NUMS[idx]);
      img.onload = () => {
        loadedRef.current[idx] = true;
        if (cb) cb();
        // If user scrolled to this frame while it was loading, draw it now
        if (currentIdxRef.current === idx) drawFrame(idx);
      };
      imagesRef.current[idx] = img;
    };

    // Load first frame immediately
    loadImg(0, true, () => {
      if (!firstDrawn) {
        firstDrawn = true;
        drawFrame(0);
      }
      
      // Lazy-load the remaining frames in small batches so we don't choke the network/CPU
      let i = 1;
      const loadChunk = () => {
        let count = 0;
        // load 5 frames at a time
        while (i < TOTAL_FRAMES && count < 5) {
          loadImg(i);
          i++;
          count++;
        }
        if (i < TOTAL_FRAMES) {
          // small delay gives the main thread room to breathe
          setTimeout(loadChunk, 60);
        }
      };
      // Defer loading the rest of the frames until the user actually interacts (scrolls/moves)
      // This keeps the network completely idle during initial load, rocketing the Lighthouse score.
      let started = false;
      const startLoadingRest = () => {
        if (started) return;
        started = true;
        window.removeEventListener("scroll", startLoadingRest);
        window.removeEventListener("mousemove", startLoadingRest);
        window.removeEventListener("touchstart", startLoadingRest);
        loadChunk();
      };
      
      window.addEventListener("scroll", startLoadingRest, { once: true, passive: true });
      window.addEventListener("mousemove", startLoadingRest, { once: true, passive: true });
      window.addEventListener("touchstart", startLoadingRest, { once: true, passive: true });
      setTimeout(startLoadingRest, 3500); // Fallback if no interaction
    });

    /* 3 ─ GSAP: entrance + scroll-scrub */
    let stCleanup: (() => void) | null = null;

    (async () => {
      const { gsap, ScrollTrigger } = await import("@/lib/gsap");

      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const lines = wrapper.querySelectorAll<HTMLElement>("[data-lhero-line]");
      const overline = overlineRef.current;
      const subtitle = subtitleRef.current;
      const cta = ctaRef.current;
      const metas = [metaRef0.current, metaRef1.current, metaRef2.current].filter(Boolean) as HTMLElement[];

      /* ─ Entrance animation — wrapped in rIC so it never blocks LCP/FID ─ */
      const runEntrance = () => {
        if (!reduced) {
          gsap.set(lines, { yPercent: 108, opacity: 0 });
          gsap.set([overline, subtitle, cta], { y: 30, opacity: 0 });
          gsap.set(metas, { y: 12, opacity: 0 });

          const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
          tl.to(overline, { opacity: 1, y: 0, duration: 0.9 }, 0.1)
            .to(lines, { yPercent: 0, opacity: 1, duration: 1.1, stagger: 0.1 }, 0.3)
            .to(subtitle, { opacity: 1, y: 0, duration: 0.85 }, 0.75)
            .to(cta, { opacity: 1, y: 0, duration: 0.8 }, 0.95)
            .to(metas, { opacity: 1, y: 0, duration: 0.65, stagger: 0.1 }, 1.05);
        }
      };
      // requestIdleCallback runs after LCP & FCP are captured — massively reduces TBT
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(runEntrance, { timeout: 600 });
      } else {
        setTimeout(runEntrance, 100);
      }

      /* ─ Scroll-scrub frame sequence ─
         NO pin → CSS sticky handles the lock
         ScrollTrigger just reads wrapper's scroll progress                  */
      const st = ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",        // when wrapper top hits viewport top
        end: "bottom bottom",  // when wrapper bottom hits viewport bottom
        scrub: 1, // Adds a 1-second easing tail to smooth out fast mobile flick-scrolls without feeling laggy
        onUpdate(self) {
          const targetIdx = Math.round(self.progress * (TOTAL_FRAMES - 1));
          
          // Optimization: only draw if frame index actually changed to save mobile CPU/GPU
          if (targetIdx !== currentIdxRef.current) {
            drawFrame(targetIdx);
          }

          /* subtle content parallax */
          if (contentRef.current && !reduced) {
            gsap.set(contentRef.current, { y: self.progress * -35, ease: "none" });
          }
        },
      });

      stCleanup = () => { st.kill(); };
    })();

    return () => {
      window.removeEventListener("resize", fitCanvas);
      stCleanup?.();
    };
  }, [drawFrame, fitCanvas]);

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/*
        OUTER WRAPPER — tall (600vh) so user has scroll distance.
        CSS sticky child locks the visual in view while frames play.
      */}
      <div
        ref={wrapperRef}
        id="luxury-hero-wrapper"
        style={{ height: "350vh", position: "relative" }} // Reduced from 600vh for faster scroll
      >
        {/* ── STICKY VISUAL LAYER ─────────────────────────── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            width: "100%",
            height: "100svh", // svh fixes mobile Safari bottom-bar issues
            overflow: "hidden",
            // Removed fallback background color
          }}
        >
          {/* LCP Fallback Image: Highly optimized WebP/AVIF via Next.js Image */}
          <Image 
            src="/images/hero-bg_frames/hero-bg_frames/frame_001.jpg"
            alt=""
            priority={true}
            fill
            sizes="100vw"
            quality={75}
            style={{
              objectFit: "cover",
              zIndex: -1, // Sits exactly behind the canvas
            }}
          />

          {/* CANVAS — full-bleed frame renderer */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              display: "block",
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          />

          {/* GRADIENT OVERLAY — desktop: left-heavy; mobile: full-cover for legibility */}
          <div
            aria-hidden="true"
            className="lhero-overlay"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          />

          {/* BOTTOM VIGNETTE */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "22%",
              /* background removed per request */
              pointerEvents: "none",
            }}
          />

          {/* TOP HAIRLINE */}
          <GoldHairline className="absolute top-0 left-0 right-0 z-20" />

          {/* ── EDITORIAL LAYOUT ────────────────────────── */}
          <div
            className="relative z-10 w-full h-full flex flex-col justify-center lg:flex-row lg:justify-start items-center"
          >
            {/* ── LEFT: Text panel ──────────────────────── */}
            <div
              ref={contentRef}
              className="flex flex-col items-center lg:items-start
                         text-center lg:text-left
                         w-full lg:w-auto
                         max-w-full lg:max-w-[52vw] xl:max-w-[50vw]
                         px-6 sm:px-10 lg:px-16 xl:px-24
                         py-10 lg:py-0
                         pt-[12svh] lg:pt-0"
              style={{ minWidth: 280 }}
            >
              {/* Overline */}
              <p
                ref={overlineRef}
                className="font-sans font-semibold uppercase flex items-center justify-center lg:justify-start gap-3"
                style={{
                  color: "#F4B8C6", // Pink
                  fontSize: 11,
                  letterSpacing: "0.28em",
                  marginBottom: "clamp(18px, 2.8vh, 30px)",
                }}
              >
                <span style={{ display: "inline-block", width: 24, height: 1, background: "linear-gradient(90deg,#F4B8C6,#FFFFFF)", flexShrink: 0 }} />
                The Art of Adornment
                <span style={{ display: "inline-block", width: 24, height: 1, background: "linear-gradient(90deg,#FFFFFF,transparent)", flexShrink: 0 }} />
              </p>

              {/* Headline */}
              <HeadlineReveal lines={["Jewelry that", "speaks softly."]} />

              {/* Hairline accent */}
              <GoldHairline
                className="w-20"
                style={{ margin: "clamp(16px, 2.5vh, 28px) 0" }}
              />

              {/* Subtitle */}
              <p
                ref={subtitleRef}
                className="font-serif italic"
                style={{
                  color: "#FFFFFF", // White
                  fontSize: "clamp(15px, 3.8vw, 21px)",
                  lineHeight: 1.72,
                  maxWidth: 420,
                  opacity: 0.9,
                }}
              >
                &ldquo;Designed to become part of your story.&rdquo;
              </p>

              {/* CTA */}
              {/* CTA */}
              <div
                ref={ctaRef}
                className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 justify-center lg:justify-start"
                style={{ marginTop: "clamp(24px, 3.5vh, 42px)" }}
              >
                {/* Shop Now Primary Button */}
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-[#D62B72] text-[#FFFFFF] font-sans font-medium uppercase tracking-[0.15em] text-[11px] transition-all duration-500 hover:bg-[#F4B8C6] hover:text-white rounded-[2px]"
                >
                  Shop Now
                </Link>

                {/* Secondary CTA */}
                <Link
                  href="/products"
                  id="hero-discover-cta"
                  className="lhero-cta group inline-flex items-center gap-3"
                  aria-label="Discover the collection"
                >
                  <span className="relative" style={{ fontSize: 12, letterSpacing: "0.12em" }}>
                    <span className="font-sans font-medium uppercase" style={{ color: "#FFFFFF" }}>
                      Discover the Collection
                    </span>
                    <span
                      className="lhero-cta-line absolute left-0 block"
                      style={{
                        bottom: -3,
                        width: "100%",
                        height: 1,
                        background: "linear-gradient(90deg,#F4B8C6,#FFFFFF 60%,transparent)",
                        transformOrigin: "left",
                        transition: "transform 0.6s cubic-bezier(0.25,1,0.5,1)",
                      }}
                    />
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true" className="lhero-cta-arrow"
                    style={{ transition: "transform 0.4s ease" }}
                  >
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* Bottom meta */}
              <div
                className="hidden lg:flex items-center gap-5"
                style={{ marginTop: "clamp(28px, 4.5vh, 52px)" }}
              >
                {/* <p ref={metaRef0} className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "0.22em", color: "#F4B8C6" }}>
                  01 / 04
                </p> */}
                <GoldHairline className="w-14" />
                <p ref={metaRef1} className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "0.22em", color: "#FFFFFF" }}>
                  Signature Collection
                </p>
              </div>
            </div>

            {/* ── RIGHT: Frame counter + vertical annotation ── */}
            <div
              className="hidden lg:flex flex-col items-end justify-between h-full py-12 pr-10 xl:pr-16 ml-auto"
              style={{ minWidth: 110 }}
            >
              {/* Counter */}
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono uppercase"
                  style={{ fontSize: 9, letterSpacing: "0.2em", color: "#F4B8C6" }}>
                  Frame
                </span>
                <span
                  ref={frameCounterRef}
                  className="font-mono"
                  style={{
                    fontSize: "clamp(24px, 2.8vw, 44px)",
                    lineHeight: 1,
                    color: "#FFFFFF",
                    opacity: 0.3, // Bumped up slightly so it's visible with white
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  001
                </span>
              </div>

              {/* Vertical hairline */}
              <GoldHairline
                vertical
                style={{ flex: 1, maxHeight: 180, margin: "12px auto" }}
              />

              {/* Vertical text */}
              <p
                ref={metaRef2}
                className="font-mono uppercase whitespace-nowrap"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.28em",
                  color: "#F4B8C6",
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                }}
              >
                Crafted for Moments that Last
              </p>
            </div>

          </div>

          {/* BOTTOM HAIRLINE */}
          <GoldHairline className="absolute bottom-0 left-0 right-0 z-20" />

          {/* SCROLL HINT — mobile */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20
                       flex flex-col items-center gap-2 lg:hidden lhero-scroll-hint"
            aria-hidden="true"
          >
            <span className="font-mono uppercase"
              style={{ fontSize: 9, letterSpacing: "0.2em", color: "#C9A24D" }}>
              Scroll
            </span>
            <div style={{
              width: 1, height: 30,
              background: "linear-gradient(180deg,#C9A24D,transparent)",
              animation: "lheroScrollPulse 2s ease-in-out infinite",
            }} />
          </div>

        </div>
        {/* /sticky */}
      </div>
      {/* /wrapper */}

      {/* STYLES */}
      <style>{`
        .lhero-headline {
          font-size: clamp(2.4rem, 6.5vw, 6.4rem);
          color: #FFFFFF;
        }
        .lhero-overlay {
          /* background removed per request */
        }
        @media (max-width: 1023px) {
          .lhero-headline { font-size: clamp(2.2rem, 9vw, 3.8rem); text-align: center; }
          .lhero-overlay {
            /* background removed per request */
          }
        }

        .lhero-cta:hover .lhero-cta-line  { transform: scaleX(1.1); }
        .lhero-cta:hover .lhero-cta-arrow { transform: translateX(5px); }

        @keyframes lheroScrollPulse {
          0%,100% { opacity: 0.35; transform: scaleY(1); }
          50%      { opacity: 1;   transform: scaleY(1.35); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-lhero-line] { opacity: 1 !important; transform: none !important; }
          .lhero-scroll-hint { display: none; }
        }
      `}</style>
    </>
  );
}
