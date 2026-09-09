"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { m } from "framer-motion";

interface Category {
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

const STATIC_CATEGORIES = [
  { label: "NEW IN",   slug: "new",      count: 87 },
  { label: "BOYS",     slug: "boys",     count: 96 },
  { label: "GIRLS",    slug: "girls",    count: 42 },
  { label: "TODDLERS", slug: "toddlers", count: 18 },
];

export default function CategoryHoverSection({ categories }: { categories: Category[] }) {
  const [activeIdx, setActiveIdx] = useState<number>(0);

  // Merge static labels with real category data
  const merged = STATIC_CATEGORIES.map((s, i) => {
    const cat = categories.find((c) => c.slug === s.slug) ?? categories[i];
    return { ...s, image: cat?.image ?? null, description: cat?.description ?? null };
  });

  const activeItem = merged[activeIdx];

  return (
    <section className="relative border-t border-[#111111]/10">
      {/* ── Section Header ── */}
      <div className="flex justify-between items-center px-6 lg:px-[5vw] py-8">
        <span className="font-mono text-[12px] text-[#111111]/60 tracking-wider">{`{ Categories }`}</span>
        <Link
          href="/products"
          className="font-mono text-[12px] uppercase tracking-widest text-[#111111] hover:text-[#111111]/50 transition-colors flex items-center gap-2"
        >
          View all <span>↗</span>
        </Link>
      </div>

      {/* ── Desktop: Two-column layout ── */}
      <div className="hidden md:flex gap-0 border-t border-[#111111]/10">

        {/* LEFT: Kinetic category list */}
        <div
          className="w-[55%] flex-shrink-0"
          onMouseLeave={() => setActiveIdx(0)}
        >
          {merged.map((item, idx) => (
            <Link key={idx} href={`/products?category=${item.slug}`}>
              <m.div
                onMouseEnter={() => setActiveIdx(idx)}
                className="group relative flex items-center justify-between border-b border-[#111111]/10 px-6 lg:px-[5vw] py-8 md:py-10 cursor-pointer overflow-hidden"
                whileHover="hover"
              >
                {/* Animated background fill on hover */}
                <m.span
                  className="absolute inset-0 bg-[#111111] origin-left z-0"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  style={{ transformOrigin: "0% 50%" }}
                  transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
                />

                {/* Number */}
                <span className="relative z-10 font-mono text-[13px] text-[#111111]/40 group-hover:text-white/50 transition-colors duration-500 w-12">
                  {String(idx + 1).padStart(2, "0")}
                </span>

                {/* Category name */}
                <h2 className="relative z-10 font-display text-[56px] lg:text-[72px] xl:text-[88px] uppercase leading-none tracking-tight text-[#111111] group-hover:text-white transition-colors duration-300 flex-1 pl-4">
                  {item.label}
                </h2>

                {/* Right: count + arrow */}
                <div className="relative z-10 flex items-center gap-4">
                  <span className="font-mono text-[11px] text-[#111111]/40 group-hover:text-white/50 transition-colors duration-500">
                    {item.count} items
                  </span>
                  <div className="w-10 h-10 rounded-full border border-[#111111]/20 group-hover:border-white/40 flex items-center justify-center transition-all duration-500 group-hover:rotate-45">
                    <span className="text-[#111111] group-hover:text-white transition-colors duration-300 text-sm">↗</span>
                  </div>
                </div>
              </m.div>
            </Link>
          ))}
          <div className="border-b border-[#111111]/10" />
        </div>

        {/* RIGHT: Always-visible image panel */}
        <div className="flex-1 relative min-h-[500px] overflow-hidden bg-[#F0F0EA] sticky top-0">
          {merged.map((item, idx) => (
            <m.div
              key={idx}
              className="absolute inset-0"
              animate={{
                opacity: activeIdx === idx ? 1 : 0,
                scale: activeIdx === idx ? 1 : 1.04,
              }}
              transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] as any }}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover"
                  sizes="45vw"
                  priority={idx === 0}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="font-display text-[64px] uppercase text-gray-300">{item.label}</span>
                </div>
              )}

              {/* Overlay with category info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <m.div
                className="absolute bottom-8 left-8 right-8"
                animate={{ y: activeIdx === idx ? 0 : 12, opacity: activeIdx === idx ? 1 : 0 }}
                transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60 mb-2">
                  {String(idx + 1).padStart(2, "0")} — {item.count} items
                </p>
                <h3 className="font-display text-[56px] text-white uppercase leading-none tracking-tight">
                  {item.label}
                </h3>
                {item.description && (
                  <p className="font-body text-[14px] text-white/70 mt-2 leading-relaxed max-w-xs">
                    {item.description}
                  </p>
                )}
                <Link
                  href={`/products?category=${item.slug}`}
                  className="inline-flex items-center gap-2 mt-5 font-mono text-[11px] uppercase tracking-widest text-white border-b border-white/40 pb-0.5 hover:border-white transition-colors"
                >
                  Shop {item.label} ↗
                </Link>
              </m.div>
            </m.div>
          ))}
        </div>
      </div>

      {/* ── Mobile: Horizontal scroll card grid ── */}
      <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-12 pt-4 no-scrollbar">
        {categories.slice(0, 4).map((cat) => (
          <Link
            key={cat.slug}
            href={`/products?category=${cat.slug}`}
            className="group relative shrink-0 w-[72vw] aspect-[3/4] snap-center rounded-3xl overflow-hidden bg-[#F0F0EA] shadow-sm"
          >
            {cat.image && (
              <Image
                src={cat.image}
                alt={cat.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="72vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6">
              <span className="font-display text-[36px] text-white leading-none uppercase">{cat.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
