"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";

interface Category {
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

interface Props {
  categories: Category[];
}

const FRAME_COUNT = 140;
const getFramePath = (index: number) => `/slowplay-bg_frames/frame_${String(index).padStart(3, '0')}.jpg`;

export default function CategoryScrollVideo({ categories }: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Refs for the UI overlays we want to animate manually
  const categoryRefs = useRef<(HTMLDivElement | null)[]>([]);

  const framesRef = useRef<HTMLImageElement[]>([]);
  const tickingRef = useRef(false);
  const loadedRef = useRef(false);

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  const [loadProgress, setLoadProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [visibleIdx, setVisibleIdx] = useState(0);

  const prefersReducedMotion = useReducedMotion();

  // Load image sequence
  useEffect(() => {
    let cancelled = false;
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = [];

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      img.src = getFramePath(i);
      img.onload = () => {
        if (cancelled) return;
        loadedCount++;
        setLoadProgress(loadedCount / FRAME_COUNT);
        if (loadedCount === FRAME_COUNT) {
          loadedRef.current = true;
          setLoaded(true);
        }
      };
      img.onerror = () => {
        if (cancelled) return;
        loadedCount++;
        setLoadProgress(loadedCount / FRAME_COUNT);
        if (loadedCount === FRAME_COUNT) {
          loadedRef.current = true;
          setLoaded(true);
        }
      };
      imgs.push(img);
    }
    framesRef.current = imgs;

    return () => {
      cancelled = true;
    };
  }, []);

  // Draw blended frames to canvas for buttery smoothness even with low frame counts
  const drawFrame = useCallback((fractionalIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedRef.current) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate indices for blending
    const index1 = Math.floor(fractionalIndex);
    const index2 = Math.min(FRAME_COUNT - 1, index1 + 1);
    const fraction = fractionalIndex - index1;

    const img1 = framesRef.current[index1];
    const img2 = framesRef.current[index2];

    if (!img1 || !img1.complete || !img1.naturalWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;
    
    const imgRatio = img1.naturalWidth / img1.naturalHeight;
    const canvasRatio = cw / ch;

    let drawW: number;
    let drawH: number;
    
    // Using 'cover' logic to fill the screen entirely without black bars
    if (canvasRatio > imgRatio) {
      // Canvas is wider than image -> match width, overflow height
      drawW = cw;
      drawH = cw / imgRatio;
    } else {
      // Canvas is taller than image -> match height, overflow width
      drawH = ch;
      drawW = ch * imgRatio;
    }

    // Optional zoom for mobile
    if (window.innerWidth <= 768) {
      drawW *= 1.1;
      drawH *= 1.1;
    }

    const drawX = (cw - drawW) / 2;
    const drawY = (ch - drawH) / 2;

    ctx.clearRect(0, 0, cw, ch);

    // Draw base frame
    if (img1 && img1.complete && img1.naturalWidth) {
      ctx.globalAlpha = 1;
      ctx.drawImage(img1, drawX, drawY, drawW, drawH);
    }

    // Draw overlay frame if we're between frames
    if (index2 !== index1 && fraction > 0.001 && img2 && img2.complete && img2.naturalWidth) {
      // If img1 failed, draw img2 at full opacity so we don't get a blank frame
      ctx.globalAlpha = (img1 && img1.complete) ? fraction : 1;
      ctx.drawImage(img2, drawX, drawY, drawW, drawH);
    }

    ctx.globalAlpha = 1; // Reset alpha
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(1, 1);
    
    drawFrame(currentProgressRef.current * (FRAME_COUNT - 1));
  }, [drawFrame]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Initial draw when loaded
  useEffect(() => {
    if (!loaded) return;
    drawFrame(0);
  }, [loaded, drawFrame]);

  // Main scroll loop handling native animations and image sequence drawing
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section || !loadedRef.current) return;

      const rect = section.getBoundingClientRect();
      const scrollable = section.offsetHeight - window.innerHeight;
      const progress = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / scrollable));
      
      // Update target progress for the lerp loop
      targetProgressRef.current = progress;
    };

    const renderLoop = () => {
      // Lerp current progress towards target progress for silky smooth scrubbing
      currentProgressRef.current += (targetProgressRef.current - currentProgressRef.current) * 0.1;
      
      // Fix Zeno's paradox: snap to exactly target if very close, 
      // ensuring we reach exactly 1.0 (the very last frame)
      if (Math.abs(targetProgressRef.current - currentProgressRef.current) < 0.0005) {
        currentProgressRef.current = targetProgressRef.current;
      }

      const p = currentProgressRef.current;

      // Only draw and update DOM if there is a meaningful change
      if (Math.abs(targetProgressRef.current - p) > 0.0001 || targetProgressRef.current === p) {
        
        // 1. Draw the blended frame
        const fractionalIndex = p * (FRAME_COUNT - 1);
        drawFrame(fractionalIndex);

        // 2. Animate category text overlays
        const catCount = categories.length;
        const rawIndex = p * catCount;
        const activeIdx = Math.min(catCount - 1, Math.floor(rawIndex));
        
        if (activeIdx !== visibleIdx) {
          setVisibleIdx(activeIdx);
        }

        categories.forEach((_, i) => {
          const el = categoryRefs.current[i];
          if (!el) return;
          
          const start = i / catCount;
          const end = (i + 1) / catCount;
          const mid = (start + end) / 2;

          let opacity = 0;
          let y = 0;

          if (p >= start && p <= end) {
            if (p <= mid) {
              const localProg = (p - start) / (mid - start);
              opacity = Math.min(1, localProg);
              y = 50 * (1 - opacity); 
            } else {
              const localProg = (p - mid) / (end - mid);
              opacity = Math.max(0, 1 - localProg);
              y = -50 * localProg; 
            }
          }

          el.style.opacity = String(opacity);
          el.style.transform = `translateY(${y}px)`;
          el.style.pointerEvents = opacity > 0.5 ? "auto" : "none";
        });
      }

      rafIdRef.current = requestAnimationFrame(renderLoop);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial setup
    
    // Start continuous render loop
    rafIdRef.current = requestAnimationFrame(renderLoop);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [categories.length, prefersReducedMotion, visibleIdx, drawFrame]);

  if (!categories || categories.length === 0) return null;

  return (
    <section 
      ref={sectionRef} 
      className="scroll-animation relative w-full"
      style={{ height: `${Math.max(categories.length * 200, 600)}vh` }}
    >
      <div
        className="sticky top-0 min-h-[100dvh] w-full overflow-hidden bg-zinc-950"
        style={{ height: "100dvh", willChange: "transform", transform: "translateZ(0)" }}
      >
        
        {/* The canvas handles the actual frame rendering for buttery smooth, zero-latency scrubbing */}
        {!prefersReducedMotion ? (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ 
              willChange: "contents", 
              transform: "translateZ(0)",
              opacity: loaded ? 1 : 0 
            }}
          />
        ) : (
          <div className="absolute inset-0 h-full w-full">
            <Image 
              src={categories[0]?.image || "/placeholder.jpg"} 
              alt="Category fallback"
              fill
              className="object-cover opacity-50"
            />
          </div>
        )}

        {/* Cinematic dark overlay gradient matching the Iron Man style */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 10%, transparent 30%, rgba(10,10,11,0.55) 70%, rgba(10,10,11,0.95) 100%)",
          }}
        />

        {/* Category Info Panels */}
        <div className="absolute inset-0 z-20 flex items-center px-6 md:px-12 lg:px-[10vw]">
          <div className="w-full max-w-4xl relative min-h-[300px]">
            {categories.map((cat, i) => (
              <div
                key={cat.slug}
                ref={(el) => { categoryRefs.current[i] = el; }}
                className="absolute top-0 left-0 w-full flex flex-col items-start"
                style={{ 
                  opacity: 0, 
                  transform: "translateY(50px)",
                  willChange: "opacity, transform",
                  transition: "opacity 80ms linear, transform 80ms linear" 
                }}
              >
                <span className="inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-red-500 mb-6">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)]" />
                  Exhibit &mdash; N°{String(i + 1).padStart(3, "0")}
                </span>
                
                <h2 className="font-display font-semibold leading-[0.88] tracking-tighter text-white text-[clamp(3.5rem,7vw,8rem)] uppercase mb-6">
                  {cat.name}
                </h2>
                
                {cat.description && (
                  <p className="max-w-[42ch] font-body text-sm md:text-base leading-relaxed text-zinc-400 mb-8">
                    {cat.description}
                  </p>
                )}

                <Link 
                  href={`/products?category=${cat.slug}`}
                  className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white border border-white/20 px-8 py-4 hover:bg-white hover:text-black transition-colors duration-300"
                >
                  Explore Collection
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Loading Overlay */}
        {!loaded && !prefersReducedMotion && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-zinc-950 px-6">
            <span className="inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.3em] text-red-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85)] animate-pulse" />
              SYSTEM PROTOCOL // BOOTING
            </span>
            <div className="h-px w-60 bg-white/10 md:w-80 overflow-hidden">
              <div
                className="h-full bg-red-500 transition-[width] duration-150 ease-out"
                style={{ width: `${Math.round(loadProgress * 100)}%` }}
              />
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-500">
              Loading Sequence &nbsp;&middot;&nbsp; {Math.round(loadProgress * 100)}%
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
