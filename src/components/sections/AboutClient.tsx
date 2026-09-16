"use client";

import React, { useRef } from "react";
import { m, useInView, useScroll, useTransform, useSpring, type Variants } from "framer-motion";
import Link from "next/link";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <m.div ref={ref} variants={fadeUp} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </m.div>
  );
}

const values = [
  {
    icon: "💎",
    title: "Timeless Craftsmanship",
    desc: "Every piece is carefully designed and crafted with premium materials to create jewelry that lasts a lifetime."
  },
  {
    icon: "✨",
    title: "Authentic Quality",
    desc: "We source only the finest materials, ensuring each product meets the highest standard of elegance and durability."
  },
  {
    icon: "🎀",
    title: "Gifting Made Special",
    desc: "Every order arrives in our signature premium packaging — making every unboxing an unforgettable experience."
  },
  {
    icon: "🚀",
    title: "Fast & Reliable",
    desc: "Nationwide delivery with real-time tracking and hassle-free returns — because we value your trust above all."
  },
];

const stats = [
  { number: "10,000+", label: "Happy Customers" },
  { number: "500+", label: "Unique Designs" },
  { number: "64", label: "Districts Covered" },
  { number: "4.9★", label: "Average Rating" },
];

const team = [
  { name: "Rimon Dutta", role: "Founder & CEO", emoji: "👑", quote: "Every woman deserves to feel like royalty." },
  { name: "Priya Sharma", role: "Head of Design", emoji: "💍", quote: "True beauty lies in the finest details." },
  { name: "Arif Hossain", role: "Operations Lead", emoji: "🤝", quote: "Excellence in delivery is our promise to you." },
];

// ─── Scroll-Interactive Card ──────────────────────────────────────────────────
function ScrollCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  const rotate  = useTransform(smoothProgress, [0, 1], [-8, 12]);
  const y       = useTransform(smoothProgress, [0, 1], [40, -40]);
  const scale   = useTransform(smoothProgress, [0, 0.5, 1], [0.88, 1.04, 0.96]);
  const bg1Rot  = useTransform(smoothProgress, [0, 1], [12, -6]);
  const bg2Rot  = useTransform(smoothProgress, [0, 1], [-6, 14]);

  return (
    <div ref={ref} className="relative flex items-center justify-center h-80 md:h-[420px] w-full">
      {/* Decorative background blobs */}
      <m.div
        style={{ rotate: bg1Rot }}
        className="absolute w-64 h-64 bg-[#D62B72]/10 rounded-[32px] top-8 left-10"
      />
      <m.div
        style={{ rotate: bg2Rot }}
        className="absolute w-64 h-64 bg-[#C9A24D]/10 rounded-[32px] top-12 left-14"
      />

      {/* Main card */}
      <m.div
        style={{ rotate, y, scale }}
        className="relative z-10 rounded-[28px] p-8 w-64 shadow-2xl flex flex-col gap-4 cursor-pointer border border-[#F3D6E2]"
        style={{ rotate, y, scale, background: "linear-gradient(135deg, #D62B72 0%, #C51F63 100%)" }}
        whileHover={{ scale: 1.06, transition: { duration: 0.3 } }}
      >
        <m.span
          style={{ rotate: useTransform(smoothProgress, [0, 1], [0, -20]) }}
          className="text-5xl inline-block"
        >
          💎
        </m.span>
        <h3 className="font-serif font-bold text-2xl text-white">Elegance in every box.</h3>
        <p className="font-sans text-white/80 text-sm leading-relaxed">
          Beautifully packaged, swiftly delivered, always breathtaking.
        </p>
      </m.div>
    </div>
  );
}

export default function AboutClient() {
  return (
    <div className="bg-[#FFF1F6] min-h-screen overflow-x-hidden">

      {/* ─── HERO ─── */}
      <section className="relative w-full min-h-[85vh] flex items-center justify-center overflow-hidden px-4"
        style={{ background: "radial-gradient(ellipse at 60% 40%, #FFF0F5 0%, #FDDDE6 50%, #FFF1F6 100%)" }}
      >
        {/* Decorative orbs */}
        <div className="absolute top-16 right-8 md:right-24 w-[300px] h-[300px] rounded-full bg-[#D62B72]/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-4 md:left-24 w-[220px] h-[220px] rounded-full bg-[#C9A24D]/10 blur-2xl pointer-events-none" />

        <m.div
          className="relative z-10 flex flex-col items-center text-center gap-6 max-w-3xl mx-auto pt-32 pb-24"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <m.span
            variants={fadeUp}
            className="inline-block bg-[#D62B72]/10 border border-[#D62B72]/20 text-[#D62B72] font-sans font-bold text-[12px] uppercase tracking-[0.25em] px-5 py-2 rounded-full"
          >
            Our Story
          </m.span>
          <m.h1
            variants={fadeUp}
            className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl text-[#252B3A] leading-[1.1] tracking-tight"
          >
            Where Elegance{" "}
            <span className="text-[#D62B72]">Meets</span>{" "}
            Tradition
          </m.h1>
          <m.p
            variants={fadeUp}
            className="font-sans text-lg sm:text-xl text-[#4B5563] max-w-xl leading-relaxed"
          >
            Labonnadhara is Bangladesh&apos;s most loved premium jewelry brand — where every piece is crafted to celebrate your most unforgettable moments.
          </m.p>
          <m.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-[#D62B72] text-white font-sans font-bold text-[15px] px-8 py-3.5 rounded-full hover:bg-[#C51F63] transition-colors shadow-lg shadow-pink-500/20"
            >
              Shop Now →
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-white border border-[#F3D6E2] text-[#D62B72] font-sans font-bold text-[15px] px-8 py-3.5 rounded-full hover:bg-[#FFF0F5] transition-colors shadow-sm"
            >
              Contact Us
            </Link>
          </m.div>
        </m.div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="bg-white border-y border-[#F3D6E2] py-10 px-4">
        <m.div
          className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {stats.map((s) => (
            <m.div key={s.label} variants={fadeUp} className="flex flex-col items-center text-center gap-1">
              <span className="font-serif font-bold text-4xl sm:text-5xl text-[#D62B72]">{s.number}</span>
              <span className="font-sans text-sm text-[#4B5563] uppercase tracking-wider">{s.label}</span>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* ─── MISSION ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <RevealSection>
            <span className="inline-block text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-[#D62B72] mb-4">Our Mission</span>
            <h2 className="font-serif font-bold text-4xl sm:text-5xl text-[#252B3A] leading-tight mb-6">
              We believe every woman deserves to{" "}
              <span className="text-[#D62B72]">shine.</span>
            </h2>
            <p className="font-sans text-[#4B5563] text-lg leading-relaxed mb-4">
              Founded with a passion for beauty and elegance, Labonnadhara was born from a simple vision — to make premium, authentic jewelry accessible to every woman in Bangladesh.
            </p>
            <p className="font-sans text-[#4B5563] text-lg leading-relaxed">
              Today we serve thousands of proud customers nationwide, with a curated collection that blends timeless tradition with modern design — for every occasion, every story, every you.
            </p>
          </RevealSection>
          <ScrollCard />
        </div>
      </section>

      {/* ─── FEATURE CARDS ─── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <m.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {[
            { emoji: "🚚", title: "Fast Delivery", desc: "Nationwide same-day & next-day shipping across all 64 districts.", bg: "#D62B72", text: "white" },
            { emoji: "💎", title: "Premium Quality", desc: "Each piece is carefully crafted and quality-checked to perfection.", bg: "#FFF0F5", text: "#252B3A" },
            { emoji: "🎁", title: "Gift Packaging", desc: "Signature luxury gift wrapping available on every order.", bg: "#252B3A", text: "white" },
            { emoji: "🔄", title: "Easy Returns", desc: "Not satisfied? Return within 7 days — no questions asked.", bg: "#C9A24D", text: "white" },
            { emoji: "💬", title: "24/7 Support", desc: "Our friendly team is always here to help you find the perfect piece.", bg: "#FFF8FB", text: "#252B3A" },
          ].map((card) => (
            <m.div
              key={card.title}
              variants={{ hidden: { opacity: 0, y: 60 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } } }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="flex flex-col gap-4 p-7 rounded-[24px] shadow-sm cursor-pointer border border-[#F3D6E2]/60"
              style={{ backgroundColor: card.bg }}
            >
              <span className="text-4xl">{card.emoji}</span>
              <h3 className="font-serif font-bold text-xl leading-tight" style={{ color: card.text }}>
                {card.title}
              </h3>
              <p className="font-sans text-sm leading-relaxed" style={{ color: card.text, opacity: 0.8 }}>
                {card.desc}
              </p>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* ─── VALUES ─── */}
      <section className="bg-white py-24 px-4 border-t border-[#F3D6E2]">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <span className="inline-block text-[12px] font-sans font-bold uppercase tracking-[0.2em] text-[#D62B72] mb-3">What We Stand For</span>
            <h2 className="font-serif font-bold text-4xl sm:text-5xl text-[#252B3A] leading-tight">Our Core Values</h2>
          </RevealSection>
          <m.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {values.map((v) => (
              <m.div
                key={v.title}
                variants={fadeUp}
                className="group bg-[#FFF0F5] border border-[#F3D6E2] rounded-[24px] p-8 hover:border-[#D62B72]/40 hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
              >
                <span className="text-4xl">{v.icon}</span>
                <h3 className="font-serif font-bold text-xl text-[#252B3A] group-hover:text-[#D62B72] transition-colors">{v.title}</h3>
                <p className="font-sans text-[#4B5563] text-sm leading-relaxed">{v.desc}</p>
              </m.div>
            ))}
          </m.div>
        </div>
      </section>


      {/* ─── CTA BANNER ─── */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-24">
        <RevealSection>
          <div
            className="relative rounded-[32px] overflow-hidden px-8 sm:px-16 py-16 flex flex-col sm:flex-row items-center justify-between gap-8"
            style={{ background: "linear-gradient(135deg, #D62B72 0%, #C51F63 100%)" }}
          >
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-serif font-bold text-3xl sm:text-4xl text-white leading-tight mb-2">
                Ready to find your perfect piece?
              </h2>
              <p className="font-sans text-white/80 text-lg">
                Explore 500+ designs crafted for your most special moments.
              </p>
            </div>
            <Link
              href="/products"
              className="relative z-10 flex-shrink-0 inline-flex items-center gap-2 bg-white text-[#D62B72] font-sans font-bold text-[15px] px-8 py-4 rounded-full hover:bg-[#FFF0F5] transition-colors shadow-lg"
            >
              Shop Now →
            </Link>
          </div>
        </RevealSection>
      </section>

    </div>
  );
}
