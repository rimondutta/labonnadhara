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
            src="/images/hero-bg.jpg"
            alt="Hero Background"
            fill
            priority
            className="object-cover object-center z-0"
          />
        </div>

        <div className="relative z-10 w-full px-4 sm:px-8 lg:px-[5vw] pt-32 pb-12 md:pb-20 flex flex-col justify-center h-full max-w-6xl">
          <div ref={heroRef} className="flex flex-col ml-auto text-left">
            <p data-hero-item className="font-serif italic text-[#de2b6a] text-xl md:text-3xl mb-3 md:mb-5">
              Welcome to Labonnadhara
            </p>

            <h1 data-hero-item className="font-serif  text-[50px] md:text-7xl lg:text-[85px] leading-[1.05] tracking-tight mb-6">
              <span className="text-[#2c3e50] block">Elegant Jewelry</span>
              <span className="text-[#de2b6a] block mt-1">for Every Moment</span>
            </h1>

            <p data-hero-item className="font-sans text-lg md:text-[22px] text-[#334155] mb-2 font-medium tracking-wide">
              Beautiful. Trendy. Timeless.
            </p>

            <p data-hero-item className="font-sans text-base md:text-lg text-[#475569] mb-10 max-w-2xl leading-relaxed">
              আপনার প্রতিদিনের লুককে আরও আকর্ষণীয় করে তুলুন<br className="hidden md:block" /> আমাদের অনন্য জুয়েলারির সাথে।
            </p>

            <div data-hero-item className="flex items-center gap-4 flex-wrap">
              <Link
                href="/products"
                className="inline-flex items-center justify-center bg-[#de2b6a] text-white font-sans font-semibold text-sm md:text-base px-10 py-4 rounded-full hover:bg-[#c4205a] transition-colors shadow-lg shadow-pink-500/30"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          FEATURES STRIP
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#FFF0F5] py-6 px-4 sm:px-8 lg:px-[5vw]">
        <AnimatedReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-2 md:gap-x-0 md:gap-y-0 max-w-5xl mx-auto md:divide-x divide-[#F3D6E2]">
            {[
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M33 8H5a2 2 0 0 0-2 2v22h2"/><path d="M3 32h30V10"/><path d="M33 18h8l6 8v6h-4"/><path d="M33 32h10"/>
                    <circle cx="13" cy="35" r="4"/><circle cx="39" cy="35" r="4"/>
                    <line x1="8" y1="14" x2="18" y2="14"/><line x1="5" y1="20" x2="18" y2="20"/><line x1="8" y1="26" x2="18" y2="26"/>
                  </svg>
                ),
                title: "Fast Delivery",
                sub: "ঢাকা ও চট্টগ্রামে দ্রুত ডেলিভারি",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                  </svg>
                ),
                title: "Secure Payment",
                sub: "নিরাপদ পেমেন্ট সুবিধা",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                  </svg>
                ),
                title: "Premium Packaging",
                sub: "সুন্দর gift-ready packaging",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                ),
                title: "Easy Exchange",
                sub: "সহজ exchange সুবিধা",
              },
            ].map(({ icon, title, sub }, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-3 md:gap-4 px-2 md:px-6 py-2 md:py-4 md:first:pl-0 md:last:pr-0 text-center md:text-left">
                <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#FFF1F6] flex items-center justify-center text-[#D62B72]">
                  {/* Scale down icon slightly on mobile using container size trick */}
                  <div className="scale-75 md:scale-100 flex items-center justify-center">
                    {icon}
                  </div>
                </div>
                <div>
                  <p className="font-sans font-bold text-[#252B3A] text-[13px] sm:text-sm md:text-base leading-tight">{title}</p>
                  <p className="font-sans text-[11px] sm:text-[12px] text-[#4B5563] mt-1 md:mt-0.5 leading-snug">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedReveal>
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
      <section className="px-4 sm:px-8 lg:px-[5vw] py-16 md:py-24 bg-white">
        <AnimatedReveal className="mb-10 relative">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-[1px] w-8 md:w-12 bg-[#D62B72]/40 rounded-full" />
              <div className="flex items-center gap-2 text-[#252B3A]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D62B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                </svg>
                <h2 className="font-serif font-bold text-3xl md:text-[32px] tracking-tight">
                  Bestsellers
                </h2>
              </div>
              <div className="h-[1px] w-8 md:w-12 bg-[#D62B72]/40 rounded-full" />
            </div>
            <p className="font-sans text-[15px] text-[#4B5563] font-medium">
              Our most loved pieces
            </p>
          </div>
          
          <div className="absolute right-0 bottom-0 hidden md:block">
            <Link
              href="/products"
              className="flex items-center gap-1.5 font-sans text-[13px] font-bold text-[#D62B72] hover:text-[#C51F63] transition-colors"
            >
              View All Products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
          </div>
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
        <section className="mx-4 sm:mx-8 lg:mx-[5vw] my-8 border-t border-b border-[#F3D6E2] py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
            {[
              { Icon: Truck, title: "Free Delivery", desc: "On all orders over ৳1,500" },
              { Icon: Headphones, title: "24/7 Support", desc: "Friendly help, always available" },
              { Icon: RotateCcw, title: "30-Day Returns", desc: "No questions asked" },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-4">
                <div className="text-[#D62B72] mb-2">
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h4 className="font-serif font-semibold text-xl tracking-wide text-[#252B3A]">{title}</h4>
                <p className="font-body text-sm text-[#4B5563]">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </AnimatedReveal>

      {/* ═══════════════════════════════════════════════
          LATEST EDITORIALS (BLOG)
          ═══════════════════════════════════════════════ */}
      {blogs.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-[5vw] py-16 md:py-24 bg-[#FFF8FB]">
          <AnimatedReveal className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="font-sans text-xs uppercase tracking-[0.2em] text-[#E86A9B] mb-3 font-semibold">Editorial</p>
              <h2 className="font-serif font-semibold text-4xl md:text-5xl text-[#252B3A] tracking-tight">
                Latest Articles
              </h2>
            </div>
            <Link
              href="/blogs"
              className="hidden md:flex items-center justify-center bg-[#D62B72] text-white font-body font-bold text-sm uppercase tracking-widest px-8 py-3 rounded-full hover:bg-[#C51F63] transition-colors"
            >
              Explore All
            </Link>
          </AnimatedReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((post) => (
              <AnimatedReveal key={post._id} className="group cursor-pointer flex flex-col gap-5">
                <div className="w-full aspect-[4/3] relative overflow-hidden bg-[#F3D6E2] rounded-2xl">
                  <Link href={`/blogs/${post.slug}`} className="block w-full h-full">
                    {post.featuredImage?.url ? (
                      <Image
                        src={post.featuredImage.url}
                        alt={post.featuredImage.alt || post.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 rounded-2xl"
                      />
                    ) : null}
                  </Link>
                </div>

                <div className="flex flex-col gap-3 pr-4">
                  <div className="flex items-center gap-4 text-xs font-sans uppercase tracking-widest text-[#E86A9B] font-semibold">
                    <span>{post.category || 'Editorial'}</span>
                    <span className="w-1 h-1 rounded-full bg-[#F3D6E2]" />
                    <span className="text-[#4B5563]">
                      {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <Link href={`/blogs/${post.slug}`}>
                    <h3 className="font-serif text-xl sm:text-2xl text-[#252B3A] leading-snug group-hover:text-[#D62B72] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="font-body text-sm text-[#4B5563] line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <Link href={`/blogs/${post.slug}`} className="inline-flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-[#D62B72] mt-2 hover:text-[#C51F63] transition-colors w-max border-b border-[#D62B72]/30 hover:border-[#C51F63] pb-1">
                    Read Story <ArrowRight size={14} />
                  </Link>
                </div>
              </AnimatedReveal>
            ))}
          </div>

          <div className="mt-12 flex justify-center md:hidden">
            <Link
              href="/blogs"
              className="w-full flex items-center justify-center bg-[#D62B72] text-white font-body font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-[#C51F63] transition-colors"
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