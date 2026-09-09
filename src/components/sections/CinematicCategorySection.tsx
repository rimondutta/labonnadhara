"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

// ─── Use the shared GSAP instance that is already connected to Lenis ───────
// We import dynamically inside useEffect (client-only) to avoid SSR issues.

interface Category {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

interface Props {
  categories: Category[];
}

export default function CinematicCategorySection({ categories }: Props) {
  const cats = categories.slice(0, 6);

  const wrapRef = useRef<HTMLDivElement>(null);  // ScrollTrigger trigger
  const stickyRef = useRef<HTMLDivElement>(null);  // pinned viewport
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const [chapterProgress, setChapterProgress] = useState(0);
  const [buffered, setBuffered] = useState(false);

  const CHAPTER_PX = 800; // px of scroll per category chapter

  // ── Draw the video's current decoded frame to the canvas ──────────────────
  const drawFrame = useCallback(() => {
    const vid = videoRef.current;
    const cv = canvasRef.current;
    if (!vid || !cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(vid, 0, 0, cv.width, cv.height);
  }, []);

  // ── Main effect: set up GSAP ScrollTrigger once video is buffered ─────────
  useEffect(() => {
    if (cats.length === 0) return;
    const vid = wrapRef.current && videoRef.current;
    if (!vid) return;

    let gsapCleanup: (() => void) | undefined;

    const setup = async () => {
      const { gsap, ScrollTrigger } = await import("@/lib/gsap");

      const video = videoRef.current!;
      const wrap = wrapRef.current!;
      const canvas = canvasRef.current!;
      const duration = video.duration;

      if (!duration) return;

      // Size canvas to match its CSS display size for crisp rendering
      const resize = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        drawFrame();
      };
      resize();
      window.addEventListener("resize", resize);

      // Draw on every seeked event (fires when codec has the frame ready)
      video.addEventListener("seeked", drawFrame);

      // Draw first frame immediately
      drawFrame();

      // Proxy object — GSAP tweens this, we read it in onUpdate
      const proxy = { t: 0 };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: `+=${cats.length * CHAPTER_PX}`,
          scrub: 1,           // 1 s lag — smooth but responsive
          pin: wrap,          // pin the wrapper (ScrollTrigger manages spacer)
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate(self) {
            const raw = self.progress * cats.length;
            const idx = Math.min(cats.length - 1, Math.floor(raw));
            const local = raw - Math.floor(raw);
            setActiveIdx(idx);
            setChapterProgress(local);
          },
        },
      });

      tl.to(proxy, {
        t: duration,
        ease: "none",
        onUpdate() {
          // Only seek if we've drifted more than half a frame (avoid micro-seeks)
          if (Math.abs(video.currentTime - proxy.t) > 0.033) {
            video.currentTime = proxy.t;
            // canvas updates asynchronously via the 'seeked' listener above
          }
        },
      });

      gsapCleanup = () => {
        tl.kill();
        ScrollTrigger.getAll().forEach((st) => st.kill());
        video.removeEventListener("seeked", drawFrame);
        window.removeEventListener("resize", resize);
      };
    };

    // Wait for enough data to seek freely (readyState 4 = HAVE_ENOUGH_DATA)
    const video = videoRef.current!;
    if (video.readyState === 4) {
      setBuffered(true);
      setup();
    } else {
      const onCanPlay = () => {
        setBuffered(true);
        setup();
      };
      video.addEventListener("canplaythrough", onCanPlay, { once: true });
      return () => {
        video.removeEventListener("canplaythrough", onCanPlay);
        gsapCleanup?.();
      };
    }

    return () => {
      gsapCleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats.length]);

  if (cats.length === 0) return null;

  return (
    <div
      ref={wrapRef}
      className="relative hidden md:block h-screen overflow-hidden"
    >
      {/* ── Hidden video element — source of truth, NOT displayed ── */}
      <video
        ref={videoRef}
        src="/video/slowplay-bg.mp4"
        muted
        playsInline
        preload="auto"       // tell browser to buffer the whole file
        className="sr-only"  // visually hidden, still in DOM for seek
        aria-hidden="true"
      />

      {/* ── Canvas — GPU-blitted frames, zero codec latency ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: "block" }}
        aria-hidden="true"
      />

      {/* Loading overlay — shows until video is buffered */}
      {!buffered && (
        <div className="absolute inset-0 bg-black/90 z-30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border border-white/20 border-t-white/80 rounded-full animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Loading…
            </span>
          </div>
        </div>
      )}

      {/* Dark cinematic overlay */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(105deg, rgba(6,6,6,0.84) 0%, rgba(6,6,6,0.5) 52%, rgba(6,6,6,0.15) 100%)",
        }}
      />

      {/* ── Top label ── */}
      <div className="absolute top-10 left-12 z-10 flex items-center gap-4">
        <div className="h-px w-8 bg-white/25" />
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/35">
          Browse Category
        </span>
      </div>

      {/* ── Chapter progress dots (right) ── */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3.5">
        {cats.map((_, i) => (
          <div
            key={i}
            className="w-[5px] rounded-full transition-all duration-500 ease-out"
            style={{
              height: i === activeIdx ? 30 : 5,
              backgroundColor:
                i === activeIdx
                  ? "rgba(255,255,255,0.85)"
                  : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>

      {/* ── Counter bottom-left ── */}
      <div className="absolute bottom-10 left-12 z-10 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
        {String(activeIdx + 1).padStart(2, "0")} / {String(cats.length).padStart(2, "0")}
      </div>

      {/* ── Scroll cue — fades after first chapter ── */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-opacity duration-700"
        style={{
          opacity: activeIdx === 0 ? Math.max(0, 1 - chapterProgress * 3) : 0,
        }}
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30">
          Scroll
        </span>
        <div className="w-px h-8 bg-white/20 animate-pulse" />
      </div>

      {/* ── Bottom progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-10 h-px bg-white/10">
        <div
          className="h-full bg-white/35 transition-none"
          style={{
            width: `${((activeIdx + chapterProgress) / cats.length) * 100}%`,
          }}
        />
      </div>

      {/* ── Category info panels ── */}
      <div className="absolute inset-0 z-[5] flex items-center px-12 lg:px-[7vw]">
        <div className="relative w-full max-w-[640px] min-h-[400px]">
          {cats.map((cat, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <div
                key={cat.slug}
                aria-hidden={!isActive}
                className="absolute top-0 left-0 w-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: isActive
                    ? "translateY(0px)"
                    : isPast
                      ? "translateY(-52px)"
                      : "translateY(52px)",
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                {/* Exhibit number */}
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/30 mb-5">
                  Exhibit&nbsp;&nbsp;N°{String(i + 1).padStart(3, "0")}
                </p>

                {/* Giant name */}
                <h2 className="font-display text-[72px] lg:text-[100px] xl:text-[120px] uppercase text-white leading-[0.86] tracking-[-0.03em] mb-6">
                  {cat.name}
                </h2>

                {/* Animated red rule grows with scroll progress */}
                <div
                  className="h-px bg-red-500/60 mb-7 origin-left transition-[width] duration-200 ease-out"
                  style={{
                    width: isActive
                      ? `${Math.round(chapterProgress * 220 + 48)}px`
                      : "48px",
                  }}
                />

                {/* Description */}
                {cat.description && (
                  <p className="font-body text-[14px] text-white/50 leading-[1.9] max-w-[400px] mb-9">
                    {cat.description}
                  </p>
                )}

                {/* CTA */}
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white border border-white/25 px-7 py-4 hover:bg-white hover:text-black transition-all duration-300 group"
                >
                  Explore Exhibit
                  <svg
                    width="15" height="15"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
