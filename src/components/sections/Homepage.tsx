import React from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowRight, Truck, RotateCcw, Headphones } from "lucide-react";

import LuxuryHero from "@/components/sections/LuxuryHero";

const DynamicProductGridRimon = dynamic(() => import("@/components/ui/product-grid-rimon"));
import AnimatedReveal from "@/components/ui/AnimatedReveal";

const DynamicInstagramSection = dynamic(() => import("./InstagramSection"));

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
  // Use props directly instead of useState for Server Component performance
  const trendingProducts = initialTrendingProducts;
  const categories = initialCategories;
  const blogs = initialBlogs;


  return (
    <div className="bg-white min-h-screen font-body" suppressHydrationWarning>

      {/* ═══════════════════════════════════════════════
          HERO — Luxury Editorial Campaign
          ═══════════════════════════════════════════════ */}
      <LuxuryHero />

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
                    <path d="M33 8H5a2 2 0 0 0-2 2v22h2" /><path d="M3 32h30V10" /><path d="M33 18h8l6 8v6h-4" /><path d="M33 32h10" />
                    <circle cx="13" cy="35" r="4" /><circle cx="39" cy="35" r="4" />
                    <line x1="8" y1="14" x2="18" y2="14" /><line x1="5" y1="20" x2="18" y2="20" /><line x1="8" y1="26" x2="18" y2="26" />
                  </svg>
                ),
                title: "Fast Delivery",
                sub: "ঢাকা ও চট্টগ্রামে দ্রুত ডেলিভারি",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11 14 15 10" />
                  </svg>
                ),
                title: "Secure Payment",
                sub: "নিরাপদ পেমেন্ট সুবিধা",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                  </svg>
                ),
                title: "Premium Packaging",
                sub: "সুন্দর gift-ready packaging",
              },
              {
                icon: (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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
                        loading="lazy"
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
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
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
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          </div>
        </AnimatedReveal>

        <DynamicProductGridRimon
          title={undefined}
          viewAllLink="/products"
          products={trendingProducts}
          theme="light"
        />
      </section>

      {/* ═══════════════════════════════════════════════
          CUSTOMER REVIEWS
          ═══════════════════════════════════════════════ */}
      <section className="px-4 sm:px-8 lg:px-[5vw] pb-16 md:pb-24 bg-white">
        <AnimatedReveal className="mb-12 relative">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-[1px] w-8 md:w-12 bg-[#D62B72]/40 rounded-full" />
              <div className="flex items-center gap-2 text-[#252B3A]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#D62B72" stroke="#D62B72" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <h2 className="font-serif font-bold text-3xl md:text-[32px] tracking-tight">
                  What Our Customers Say
                </h2>
              </div>
              <div className="h-[1px] w-8 md:w-12 bg-[#D62B72]/40 rounded-full" />
            </div>
            <p className="font-sans text-[15px] text-[#4B5563] font-medium">
              Real stories. Real happiness.
            </p>
          </div>
        </AnimatedReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
          {[
            {
              productImg: "https://scontent.fcgp3-2.fna.fbcdn.net/v/t39.30808-6/788705149_1095884756115913_6096616204972118746_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2046&ctp=s2048x2046&_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHfewiS2FKAkuFYXynS1aabgJRSS139fyyAlFJLXf1_LOW9S-acBR9eI_LKKL3px4g_HIIh8y7CIjzx_nMAjzKr&_nc_ohc=lxmauW6-nrIQ7kNvwGbaydU&_nc_oc=Ado0TbnAdw-iRnSzxIJKAn1-DGtuSyjbEarRP7OikskplDfkbFPikOupUaeG_TZJwvM&_nc_zt=23&_nc_ht=scontent.fcgp3-2.fna&_nc_gid=GbM5w5pNLefC5ehA7GU_iQ&_nc_ss=7b2a8&oh=00_AQIwAPU9esUXsmiZAp9SsEm4b0T5K_L_LfchknP1AZxpmQ&oe=6AB09B30",
              review: "জুয়েলারির কোয়ালিটি খুব ভালো। প্যাকেজিংও অসাধারণ ছিল। অবশ্যই আবার কিনবো।",
              name: "Trishna Das",
              location: "Chattogram",
              avatarImg: "https://scontent.fcgp3-2.fna.fbcdn.net/v/t39.30808-6/788705149_1095884756115913_6096616204972118746_n.jpg?stp=dst-jpg_tt6&cstp=mx2048x2046&ctp=s2048x2046&_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHfewiS2FKAkuFYXynS1aabgJRSS139fyyAlFJLXf1_LOW9S-acBR9eI_LKKL3px4g_HIIh8y7CIjzx_nMAjzKr&_nc_ohc=lxmauW6-nrIQ7kNvwGbaydU&_nc_oc=Ado0TbnAdw-iRnSzxIJKAn1-DGtuSyjbEarRP7OikskplDfkbFPikOupUaeG_TZJwvM&_nc_zt=23&_nc_ht=scontent.fcgp3-2.fna&_nc_gid=GbM5w5pNLefC5ehA7GU_iQ&_nc_ss=7b2a8&oh=00_AQIwAPU9esUXsmiZAp9SsEm4b0T5K_L_LfchknP1AZxpmQ&oe=6AB09B30"
            },
            {
              productImg: "/placeholder.jpg",
              review: "ডিজাইনগুলো খুবই সুন্দর এবং ইউনিক। দামও যেন রিজনেবল। Recommended!",
              name: "Nusrat Jahan",
              location: "Chattogram",
              avatarImg: "/placeholder.jpg"
            },
            {
              productImg: "/placeholder.jpg",
              review: "আমি অনেক খুশি! পণ্যের মান এবং সার্ভিস দারুণ। ধন্যবাদ Labonnadhara 🤩",
              name: "Rafiya Islam",
              location: "Chattogram",
              avatarImg: "/placeholder.jpg"
            }
          ].map((item, i) => (
            <AnimatedReveal key={i} delay={i * 0.1}>
              <div className="bg-[#FFF8FB] border border-[#F3D6E2] rounded-2xl p-5 sm:p-6 flex gap-5 items-center hover:shadow-md transition-shadow duration-300">
                <div className="shrink-0 relative w-[80px] h-[80px] sm:w-[90px] sm:h-[90px] rounded-full overflow-hidden shadow-sm border-2 border-white">
                  <Image src={item.productImg} alt="Customer product" fill loading="lazy" sizes="90px" className="object-cover" unoptimized />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex text-[#F59E0B] mb-2 gap-0.5">
                    {[...Array(5)].map((_, idx) => (
                      <svg key={idx} width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                  <p className="font-sans text-[13px] sm:text-[14px] font-medium text-[#4B5563] leading-relaxed mb-4 line-clamp-3">
                    "{item.review}"
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden shadow-sm border border-white">
                      <Image src={item.avatarImg} alt={item.name} fill loading="lazy" sizes="32px" className="object-cover" unoptimized />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-[13px] text-[#252B3A] leading-none mb-1">{item.name}</span>
                      <span className="font-sans text-[11px] text-gray-500 leading-none">{item.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedReveal>
          ))}
        </div>
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



      {/* Instagram — lazy loaded */}
      <DynamicInstagramSection />

    </div>
  );
}