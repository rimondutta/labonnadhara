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
  { icon: "🎨", title: "Creativity First", desc: "Every toy we carry is handpicked to spark imagination, open-ended play, and genuine joy in children of all ages." },
  { icon: "🛡️", title: "Safety Guaranteed", desc: "All products pass rigorous quality checks and meet international safety standards — so parents can shop with complete peace of mind." },
  { icon: "🌱", title: "Play for Good", desc: "We donate a portion of every sale to childhood literacy programs across Bangladesh, because every child deserves a bright future." },
  { icon: "🚀", title: "Fast & Reliable", desc: "Nationwide delivery with real-time tracking and hassle-free returns — because we value your time as much as your child's smile." },
];

const stats = [
  { number: "50,000+", label: "Happy Families" },
  { number: "2,000+", label: "Premium Products" },
  { number: "64", label: "Districts Covered" },
  { number: "4.9★", label: "Average Rating" },
];

const team = [
  { name: "Rimon Dutta", role: "Founder & CEO", emoji: "👨‍💼", quote: "Every child deserves to play, dream, and grow." },
  { name: "Priya Rahman", role: "Head of Curation", emoji: "👩‍🎨", quote: "A great toy is one that grows with the child." },
  { name: "Arif Hossain", role: "Operations Lead", emoji: "👨‍🔧", quote: "Reliability is our promise to every parent." },
];

// ─── Scroll-Interactive Card ──────────────────────────────────────────────────
function ScrollCard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });

  // Smooth springs for all values
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 80, damping: 20 });

  const rotate   = useTransform(smoothProgress, [0, 1], [-8, 12]);
  const y        = useTransform(smoothProgress, [0, 1], [40, -40]);
  const scale    = useTransform(smoothProgress, [0, 0.5, 1], [0.88, 1.04, 0.96]);
  const bg1Rot   = useTransform(smoothProgress, [0, 1], [12, -6]);
  const bg2Rot   = useTransform(smoothProgress, [0, 1], [-6, 14]);

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center h-80 md:h-[420px] w-full"
    >
      {/* Back shapes — counter-rotate for parallax depth */}
      <m.div
        style={{ rotate: bg1Rot }}
        className="absolute w-64 h-64 bg-[#D5AEFD]/30 rounded-[32px] top-8 left-10"
      />
      <m.div
        style={{ rotate: bg2Rot }}
        className="absolute w-64 h-64 bg-[#043224]/10 rounded-[32px] top-12 left-14"
      />

      {/* Main card */}
      <m.div
        style={{ rotate, y, scale }}
        className="relative z-10 bg-[#043224] rounded-[28px] p-8 w-64 shadow-2xl flex flex-col gap-4 cursor-pointer"
        whileHover={{ scale: 1.06, transition: { duration: 0.3 } }}
      >
        <m.span
          style={{ rotate: useTransform(smoothProgress, [0, 1], [0, -20]) }}
          className="text-5xl inline-block"
        >
          🧸
        </m.span>
        <h3 className="font-body font-black text-2xl text-white">Joy in every box.</h3>
        <p className="font-body text-white/70 text-sm leading-relaxed">
          Carefully packaged, swiftly delivered, always delightful.
        </p>
      </m.div>
    </div>
  );
}

export default function AboutClient() {
  return (
    <div className="bg-[#FEFAF3] min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden bg-[#043224] px-4">
        <div className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full bg-[#D5AEFD]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-16 w-[320px] h-[320px] rounded-full bg-[#D5AEFD]/10 blur-2xl pointer-events-none" />
        <m.div
          className="relative z-10 flex flex-col items-center text-center gap-6 max-w-3xl mx-auto pt-32 pb-24"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <m.span variants={fadeUp} className="inline-block bg-[#D5AEFD]/20 border border-[#D5AEFD]/40 text-[#D5AEFD] font-body font-bold text-[12px] uppercase tracking-[0.25em] px-5 py-2 rounded-full">
            Our Story
          </m.span>
          <m.h1 variants={fadeUp} className="font-body font-black text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight">
            Where Play <span className="text-[#D5AEFD]">Meets</span> Purpose
          </m.h1>
          <m.p variants={fadeUp} className="font-body text-lg sm:text-xl text-white/70 max-w-xl leading-relaxed">
            Toyhourse is Bangladesh&apos;s most loved toy store — built by parents, for parents — to fill every childhood with color, wonder, and laughter.
          </m.p>
          <m.div variants={fadeUp} className="flex flex-wrap gap-4 justify-center pt-2">
            <Link href="/products" className="inline-flex items-center gap-2 bg-[#D5AEFD] text-black font-body font-bold text-[15px] px-8 py-3.5 rounded-full hover:bg-[#D5AEFD]/90 transition-colors">
              Shop Now →
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-body font-bold text-[15px] px-8 py-3.5 rounded-full hover:bg-white/20 transition-colors">
              Contact Us
            </Link>
          </m.div>
        </m.div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-y border-gray-100 py-10 px-4">
        <m.div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {stats.map((s) => (
            <m.div key={s.label} variants={fadeUp} className="flex flex-col items-center text-center gap-1">
              <span className="font-body font-black text-4xl sm:text-5xl text-[#043224]">{s.number}</span>
              <span className="font-body text-sm text-gray-500 uppercase tracking-wider">{s.label}</span>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* Mission */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <RevealSection>
            <span className="inline-block text-[12px] font-bold uppercase tracking-[0.2em] text-[#043224] mb-4">Our Mission</span>
            <h2 className="font-body font-black text-4xl sm:text-5xl text-[#1A1F3A] leading-tight mb-6">
              We believe play is<br /><span className="text-[#D5AEFD]">serious business.</span>
            </h2>
            <p className="font-body text-gray-600 text-lg leading-relaxed mb-4">
              Founded in 2021, Toyhourse was born from a simple frustration — finding safe, high-quality, imaginative toys in Bangladesh was far too hard. So we built the solution ourselves.
            </p>
            <p className="font-body text-gray-600 text-lg leading-relaxed">
              Today we serve over 50,000 families nationwide, with a curated collection of toys that entertain, educate, and inspire children from 0 to 12 years old.
            </p>
          </RevealSection>
          <ScrollCard />
        </div>
      </section>

      {/* ── 5 Scroll-Up Feature Cards ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <m.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          {[
            { emoji: "🚀", title: "Fast Delivery", desc: "Nationwide same-day & next-day shipping to all 64 districts.", bg: "#043224", text: "white" },
            { emoji: "🛡️", title: "100% Safe", desc: "Every product certified to international child safety standards.", bg: "#D5AEFD", text: "#1A1F3A" },
            { emoji: "🎁", title: "Gift Ready", desc: "Beautiful gift wrapping available on every order, free of charge.", bg: "#1A1F3A", text: "white" },
            { emoji: "🔄", title: "Easy Returns", desc: "Not happy? Return within 7 days — no questions asked.", bg: "#A3E635", text: "#14532D" },
            { emoji: "💬", title: "24/7 Support", desc: "Our friendly team is always here to help you find the perfect toy.", bg: "#FF5533", text: "white" },
          ].map((card) => (
            <m.div
              key={card.title}
              variants={{
                hidden: { opacity: 0, y: 60 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
              }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="flex flex-col gap-4 p-7 rounded-[24px] shadow-sm cursor-pointer"
              style={{ backgroundColor: card.bg }}
            >
              <span className="text-4xl">{card.emoji}</span>
              <h3
                className="font-body font-black text-xl leading-tight"
                style={{ color: card.text }}
              >
                {card.title}
              </h3>
              <p
                className="font-body text-sm leading-relaxed"
                style={{ color: card.text, opacity: 0.75 }}
              >
                {card.desc}
              </p>
            </m.div>
          ))}
        </m.div>
      </section>

      {/* Values */}

      <section className="bg-white py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <span className="inline-block text-[12px] font-bold uppercase tracking-[0.2em] text-[#043224] mb-3">What We Stand For</span>
            <h2 className="font-body font-black text-4xl sm:text-5xl text-[#1A1F3A] leading-tight">Our Core Values</h2>
          </RevealSection>
          <m.div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {values.map((v) => (
              <m.div key={v.title} variants={fadeUp} className="group bg-[#FEFAF3] border border-gray-100 rounded-[24px] p-8 hover:border-[#D5AEFD] hover:shadow-lg transition-all duration-300 flex flex-col gap-4">
                <span className="text-4xl">{v.icon}</span>
                <h3 className="font-body font-black text-xl text-[#1A1F3A] group-hover:text-[#043224] transition-colors">{v.title}</h3>
                <p className="font-body text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </m.div>
            ))}
          </m.div>
        </div>
      </section>



      {/* CTA Banner */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-6xl mb-24">
        <RevealSection>
          <div className="relative bg-[#D5AEFD] rounded-[32px] overflow-hidden px-8 sm:px-16 py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/20 rounded-full blur-3xl pointer-events-none" />
            <div>
              <h2 className="font-body font-black text-3xl sm:text-4xl text-[#1A1F3A] leading-tight mb-2">Ready to spread some joy?</h2>
              <p className="font-body text-[#1A1F3A]/70 text-lg">Explore 2,000+ toys hand-picked for your little one.</p>
            </div>
            <Link href="/products" className="flex-shrink-0 inline-flex items-center gap-2 bg-[#043224] text-white font-body font-bold text-[15px] px-8 py-4 rounded-full hover:bg-[#043224]/90 transition-colors shadow-lg">
              Shop Now →
            </Link>
          </div>
        </RevealSection>
      </section>

    </div>
  );
}
