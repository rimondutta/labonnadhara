"use client";

import React, { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
import Link from "next/link";
import Image from "next/image";
const DynamicProductGridNike = dynamic(() => import("@/components/ui/product-grid-nike"));
import AnimatedReveal from "@/components/ui/AnimatedReveal";
import dynamic from "next/dynamic";
const DynamicAppDownloadSection = dynamic(() => import("./AppDownloadSection"));
import { ArrowRight, Truck, RotateCcw, Headphones } from "lucide-react";

const DynamicInstagramSection = dynamic(() => import("./InstagramSection"), { ssr: false });


interface Product {
  _id: string; title: string; slug: string; price: number;
  compareAtPrice?: number; images: { url: string; alt?: string }[];
  badge?: string; ageRange?: string; rating?: number; reviewCount?: number;
}
interface Category { name: string; slug: string; image: string; }

export default function Homepage({
  initialTrendingProducts = [],
  initialCategories = [],
  initialBlogs = [],
}: {
  initialTrendingProducts?: Product[];
  initialCategories?: Category[];
  initialBlogs?: any[];
}) {
  preload('/video/hero-bg.mp4', { as: 'video', fetchPriority: 'high' });
  const [trendingProducts] = useState<any[]>(initialTrendingProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [blogs] = useState<any[]>(initialBlogs);
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
    })();

    return () => { ctx.then(tl => tl?.kill()); };
  }, []);


  return (
    <div className="bg-white min-h-screen font-body" suppressHydrationWarning>

      {/* ═══════════════════════════════════════════════
          HERO — Full width video background
          ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-black/40 z-10" /> {/* Dark overlay for readability */}

          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
          >
            <source src="/video/hero-bg.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-[5vw] pt-32 pb-12 md:pb-20">
          <div ref={heroRef} className="flex flex-col max-w-2xl">
            <div data-hero-item className="mb-4">
              <span className="inline-flex items-center gap-2 bg-transparent text-white/80 font-mono text-xs uppercase tracking-[0.2em] border border-white/20 px-4 py-2">
                Curated Collection
              </span>
            </div>

            <h1
              data-hero-item
              className="font-serif font-light text-[52px] sm:text-[64px] lg:text-[80px] xl:text-[96px] text-white leading-[1.05] tracking-tight mb-8"
            >
              Timeless
              <br />
              <span className="italic text-white/90">Jewelry</span>
              <br />
              Made to Shine.
            </h1>

            <p
              data-hero-item
              className="font-body font-light text-lg text-white/70 max-w-md mb-12 leading-relaxed"
            >
              Discover elegant jewelry designed to make every moment special. From everyday pieces to statement styles, find something that feels uniquely yours.
            </p>

            <div data-hero-item className="flex items-center gap-4 flex-wrap">
              <Link
                href="/products"
                className="inline-flex items-center justify-center bg-white text-black font-body font-medium text-sm uppercase tracking-widest px-8 py-4 hover:bg-black hover:text-white transition-colors"
              >
                Shop Now
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center justify-center bg-transparent border border-white/30 text-white font-body font-medium text-sm uppercase tracking-widest px-8 py-4 hover:bg-white/10 transition-colors"
              >
                Browse Catagories
              </Link>
            </div>

            {/* Trust indicators */}
            <div data-hero-item className="mt-16 flex items-center gap-8 flex-wrap">
              {[
                { label: "4.9 from 2,400+ parents" },
                { label: "Free shipping over ৳1,500" },
                { label: "30-day returns" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 opacity-60">
                  <span className="font-mono text-xs uppercase tracking-wider text-white">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORIES — Horizontal scroll cards on mobile, grid on desktop
          ═══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="py-16 md:py-24 px-4 sm:px-8 lg:px-[5vw]">
          <AnimatedReveal className="flex items-end justify-between mb-12">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Shop by Category</p>
              <h2 className="font-serif font-light text-4xl md:text-5xl text-black tracking-tight">
                Curated Collections
              </h2>
            </div>
            <Link
              href="/products"
              className="hidden md:flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-black hover:text-zinc-500 transition-colors border-b border-black/20 hover:border-zinc-500 pb-1"
            >
              All categories
            </Link>
          </AnimatedReveal>

          {/* Desktop: grid */}
          <div className="hidden md:grid grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat, i) => (
              <AnimatedReveal key={cat.slug} delay={i * 0.06}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="group relative aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden bg-zinc-100 flex flex-col items-center justify-end p-6 hover:shadow-2xl transition-all duration-500"
                >
                  {cat.image && (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      sizes="(max-width: 1024px) 33vw, 16vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 font-serif font-light italic text-white text-xl text-center leading-tight tracking-wide">
                    {cat.name}
                  </span>
                </Link>
              </AnimatedReveal>
            ))}
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 no-scrollbar -mx-4 px-4">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="relative shrink-0 w-48 aspect-[3/4] snap-center rounded-2xl overflow-hidden bg-zinc-100 flex items-end p-5 shadow-sm"
              >
                {cat.image && (
                  <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="200px" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80" />
                <span className="relative z-10 font-serif font-light italic text-white text-lg leading-tight tracking-wide">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          TRENDING PRODUCTS
          ═══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-[5vw] py-16 md:py-24">
        <AnimatedReveal className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Most Loved</p>
            <h2 className="font-serif font-light text-4xl md:text-5xl text-black tracking-tight">
              Bestselling Picks
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden md:flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-black hover:text-zinc-500 transition-colors border-b border-black/20 hover:border-zinc-500 pb-1"
          >
            More products
          </Link>
        </AnimatedReveal>

        <DynamicProductGridNike
          title={undefined}
          viewAllLink="/products"
          products={trendingProducts}
          theme="light"
        />
      </section>

      {/* ═══════════════════════════════════════════════
          TRUST STRIP
          ═══════════════════════════════════════════════ */}
      <AnimatedReveal>
        <section className="mx-4 sm:mx-8 lg:mx-[5vw] my-8 border-t border-b border-black/10 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
            {[
              { Icon: Truck, title: "Free Delivery", desc: "On all orders over ৳1,500" },
              { Icon: Headphones, title: "24/7 Support", desc: "Friendly help, always available" },
              { Icon: RotateCcw, title: "30-Day Returns", desc: "No questions asked" },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-4">
                <div className="text-black mb-2 opacity-80">
                  <Icon size={28} strokeWidth={1} />
                </div>
                <h4 className="font-serif font-light text-xl tracking-wide text-black">{title}</h4>
                <p className="font-body font-light text-zinc-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedReveal>

      {/* ═══════════════════════════════════════════════
          LATEST EDITORIALS (BLOG)
          ═══════════════════════════════════════════════ */}
      {blogs.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-[5vw] py-16 md:py-24 bg-[#F5F5F5]">
          <AnimatedReveal className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">Editorial</p>
              <h2 className="font-serif font-light text-4xl md:text-5xl text-black tracking-tight">
                Latest Articles
              </h2>
            </div>
            <Link
              href="/blogs"
              className="hidden md:flex items-center justify-center bg-[#D5AEFD] text-black font-body font-bold text-sm uppercase tracking-widest px-8 py-3 hover:bg-[#D5AEFD]/90 transition-colors"
            >
              Explore All
            </Link>
          </AnimatedReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((post) => (
              <AnimatedReveal key={post._id} className="group cursor-pointer flex flex-col gap-5">
                <div className="w-full aspect-[4/3] relative overflow-hidden bg-zinc-200">
                  <Link href={`/blogs/${post.slug}`} className="block w-full h-full">
                    {post.featuredImage?.url ? (
                      <Image
                        src={post.featuredImage.url}
                        alt={post.featuredImage.alt || post.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : null}
                  </Link>
                </div>

                <div className="flex flex-col gap-3 pr-4">
                  <div className="flex items-center gap-4 text-xs font-mono uppercase tracking-widest text-zinc-500">
                    <span>{post.category || 'Editorial'}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span>
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Link href={`/blogs/${post.slug}`}>
                    <h3 className="font-serif text-xl sm:text-2xl text-black leading-snug group-hover:text-[#D5AEFD] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="font-body text-sm font-light text-zinc-600 line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <Link href={`/blogs/${post.slug}`} className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black mt-2 hover:text-[#043224] transition-colors w-max border-b border-black/20 hover:border-black pb-1">
                    Read Story <ArrowRight size={14} />
                  </Link>
                </div>
              </AnimatedReveal>
            ))}
          </div>

          <div className="mt-12 flex justify-center md:hidden">
            <Link
              href="/blogs"
              className="w-full flex items-center justify-center bg-[#D5AEFD] text-black font-body font-bold text-sm uppercase tracking-widest px-8 py-4 hover:bg-[#D5AEFD]/90 transition-colors"
            >
              Explore All
            </Link>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          APP DOWNLOAD
          ═══════════════════════════════════════════════ */}
      <DynamicAppDownloadSection />

      {/* Instagram — lazy loaded */}
      <DynamicInstagramSection />

    </div>
  );
}