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
          HERO — Full width image background
          ═══════════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">


        <div className="absolute inset-0 z-0 bg-[#0a0a0a]">
          <div className="absolute inset-0 /40 z-10" />
          <Image
            src="/images/hero-bg.png"
            alt="Hero Background"
            fill
            priority
            className="object-cover object-center z-0"
          />
        </div>


      </section>

      {/* ═══════════════════════════════════════════════
          CATEGORIES — Circular design matching reference
          ═══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="py-16 md:py-24 px-4 sm:px-8 lg:px-[5vw]">
          <AnimatedReveal className="flex flex-col items-center justify-center mb-12 text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="h-[2px] w-12 bg-pink-300 rounded-full" />
              <h2 className="font-serif font-semibold text-3xl md:text-[34px] text-slate-800 tracking-tight">
                Shop by Category
              </h2>
              <div className="h-[2px] w-12 bg-pink-300 rounded-full" />
            </div>
            <p className="font-sans text-sm md:text-base text-gray-500 font-medium">
              Find the perfect piece for your style
            </p>
          </AnimatedReveal>

          <div className="flex flex-nowrap md:flex-wrap items-center md:justify-center gap-6 md:gap-14 overflow-x-auto snap-x snap-mandatory pb-6 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {categories.slice(0, 5).map((cat, i) => (
              <AnimatedReveal key={cat.slug} delay={i * 0.1}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-5 shrink-0 snap-center w-36 md:w-44"
                >
                  {/* Circle Image Container */}
                  <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden bg-gradient-to-br from-pink-50 to-pink-200 flex items-center justify-center group-hover:shadow-lg transition-shadow duration-500 shadow-sm">
                    {cat.image && (
                      <Image
                        src={cat.image}
                        alt={cat.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        sizes="(max-width: 768px) 144px, 176px"
                      />
                    )}
                  </div>

                  {/* Text Below */}
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-serif text-[17px] md:text-lg font-bold text-slate-800 text-center leading-tight">
                      {cat.name}
                    </span>
                    <span className="flex items-center gap-1 font-sans text-[13px] font-bold text-[#f52274] group-hover:text-[#d11059] transition-colors">
                      View All <ArrowRight size={14} className="stroke-[3]" />
                    </span>
                  </div>
                </Link>
              </AnimatedReveal>
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