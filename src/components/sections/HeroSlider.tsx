"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination, Navigation } from "swiper/modules";

// Swiper CSS is imported in globals.css to avoid render-blocking stylesheets

function AccentLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex">
      <span className="uppercase text-[11px] font-bold tracking-[0.25em] text-neutral-500 relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-px after:bg-neutral-300">
        {children}
      </span>
    </div>
  );
}

function UnderlineLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`group relative inline-flex ${className}`}>
      <span>{children}</span>
      <span className="absolute -bottom-1 left-0 w-full h-[1.5px] bg-black scale-x-100 origin-left transition-transform duration-300 group-hover:scale-x-0" />
    </Link>
  );
}

const SLIDES = [
  {
    id: 1,
    title: (
      <>
        Summer Fun<br />Toys
      </>
    ),
    subtitle: "Limited Time Offer — Up to 60% off & Free Shipping",
    label: "New Arrivals",
    image: "/images/hero-banner-4.jpeg",
    bgColor: "#f4e5e0",
    link: "/products?badge=New",
  },
  {
    id: 2,
    title: (
      <>
        Creative<br />Learning
      </>
    ),
    subtitle: "Discover our new educational collection for curious minds",
    label: "Featured",
    image: "/images/hero-banner-2.png",
    bgColor: "#e2f0ea",
    link: "/products?category=educational",
  },
  {
    id: 3,
    title: (
      <>
        Classic<br />Wooden
      </>
    ),
    subtitle: "Sustainable, durable, and beautifully crafted wooden toys",
    label: "Bestsellers",
    image: "/images/hero-banner-3.png",
    bgColor: "#f0ece2",
    link: "/products?category=wooden",
  },
];

export default function HeroSlider() {
  return (
    <div className="w-full relative group hero-slider-container">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation]}
        effect="fade"
        speed={800}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
          el: ".hero-pagination",
          bulletClass: "swiper-bullet-custom",
          bulletActiveClass: "swiper-bullet-custom-active",
        }}
        navigation={{
          nextEl: ".hero-next",
          prevEl: ".hero-prev",
        }}
        loop={true}
        className="w-full"
      >
        {SLIDES.map((slide, index) => (
          <SwiperSlide key={slide.id}>
            <section className="relative flex items-center min-h-[480px] md:min-h-[600px] lg:min-h-[700px] w-full overflow-hidden">
              {/* Full Width Background Image */}
              <Image
                src={slide.image}
                alt={slide.label}
                fill
                sizes="100vw"
                className="object-cover"
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
              />
              
              {/* Dark Overlay for better text readability */}
              <div className="absolute inset-0 bg-black/20" />

              {/* Overlaid Editorial Text */}
              <div className="relative z-10 flex flex-col gap-5 w-full md:w-1/2 px-8 sm:px-16 lg:px-24">
                <div className="inline-flex">
                  <span className="uppercase text-[11px] font-bold tracking-[0.25em] text-white relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-px after:bg-white/50">
                    {slide.label}
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-[70px] uppercase font-bold leading-none tracking-tight text-white drop-shadow-md">
                  {slide.title}
                </h1>
                <span className="text-white text-base max-w-md drop-shadow">
                  {slide.subtitle}
                </span>
                <div className="flex mt-2">
                  <Link 
                    href={slide.link} 
                    className="group relative inline-flex uppercase text-sm font-medium text-white tracking-wide"
                  >
                    <span>Discover More</span>
                    <span className="absolute -bottom-1 left-0 w-full h-[1.5px] bg-white scale-x-100 origin-left transition-transform duration-300 group-hover:scale-x-0" />
                  </Link>
                </div>
              </div>
            </section>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation & Pagination overlaid on top */}
      <div className="absolute z-20 bottom-8 left-8 sm:left-16 lg:left-24 flex items-center gap-6">
        <div className="hero-pagination flex items-center gap-2" />
      </div>

      {/* Navigation Arrows (visible on hover) */}
      <button className="hero-prev absolute z-20 left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button className="hero-next absolute z-20 right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/40 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        .swiper-bullet-custom {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          cursor: pointer;
          display: block;
          transition: all 0.3s ease;
        }
        .swiper-bullet-custom-active {
          background: rgba(255,255,255,1);
          width: 24px;
          border-radius: 4px;
        }
      `}} />
    </div>
  );
}
