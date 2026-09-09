import React from "react";
import Image from "next/image";
import Link from "next/link";
import { FaAndroid, FaApple, FaDownload, FaStar, FaBolt, FaTruck, FaTag, FaCode, FaGithub } from "react-icons/fa";

export const metadata = {
  title: "Download App | Toy Hourse",
  description: "Download the official Toy Hourse app for Android and iOS. 100% Open Source.",
};

const features = [
  { icon: FaBolt, label: "Lightning Checkout", desc: "Order in seconds with saved addresses & payments" },
  { icon: FaTag, label: "App-Only Deals", desc: "Exclusive discounts only available in the app" },
  { icon: FaTruck, label: "Live Order Tracking", desc: "Know exactly where your order is, in real time" },
  { icon: FaCode, label: "100% Open Source", desc: "Transparent, secure, and completely open source codebase for everyone" },
];

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden" suppressHydrationWarning>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 pt-32 pb-24">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-16 lg:gap-20">

          {/* ── Left: Text + Buttons ── */}
          <div className="flex-1 min-w-0 space-y-7 text-center lg:text-left">

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <div className="inline-flex items-center gap-2 bg-violet-100 border border-violet-300 px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse shrink-0" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-violet-800 whitespace-nowrap">
                  Official Mobile App
                </span>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 border border-emerald-300 px-4 py-1.5 rounded-full">
                <FaCode className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-800 whitespace-nowrap">
                  100% Open Source
                </span>
              </div>
            </div>

            {/* Heading */}
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl uppercase leading-[1.05] tracking-tight text-slate-900 font-bold">
              Get the<br />
              <span className="text-violet-600">Toy Hourse</span><br />
              App
            </h1>

            {/* Description */}
            <p className="font-body text-base lg:text-lg text-slate-700 max-w-md mx-auto lg:mx-0 leading-relaxed font-medium">
              Shop smarter on the go — faster checkout, app-only deals,
              and live order tracking, all in your pocket.
            </p>

            {/* Download & Source Code Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Android */}
              <a
                href="https://github.com/rimondutta/toyhourse-mobile-app/releases/download/v1.0.0/toyhourse.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-violet-600 hover:bg-violet-700 text-white px-7 py-4 rounded-2xl transition-all duration-300 w-full sm:w-auto justify-center shadow-[0_8px_30px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_40px_rgba(124,58,237,0.55)] hover:-translate-y-0.5"
              >
                <FaAndroid className="w-7 h-7 text-green-300 shrink-0" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest leading-none text-white/80">Direct Download</span>
                  <span className="text-lg font-bold leading-snug text-white">Android APK</span>
                </div>
                <FaDownload className="w-4 h-4 ml-1 text-white/70 group-hover:text-white transition-colors shrink-0" />
              </a>

              {/* iOS */}
              <Link
                href="#ios-coming-soon"
                className="flex items-center gap-4 bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-900 px-7 py-4 rounded-2xl transition-all duration-300 w-full sm:w-auto justify-center shadow-sm"
              >
                <FaApple className="w-6 h-6 shrink-0 text-slate-900" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest leading-none text-slate-500">Coming soon</span>
                  <span className="text-lg font-bold leading-snug text-slate-900">App Store</span>
                </div>
              </Link>

              {/* GitHub Source Code */}
              <a
                href="https://github.com/rimondutta/toyhourse-mobile-app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-slate-900 hover:bg-slate-800 text-white px-7 py-4 rounded-2xl transition-all duration-300 w-full sm:w-auto justify-center shadow-md hover:-translate-y-0.5"
              >
                <FaGithub className="w-6 h-6 shrink-0 text-white" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-[10px] font-semibold uppercase tracking-widest leading-none text-slate-400">View Code</span>
                  <span className="text-lg font-bold leading-snug text-white">GitHub Repo</span>
                </div>
              </a>
            </div>

            {/* Version info */}
            <p className="font-mono text-[11px] text-slate-600 font-semibold tracking-widest">
              v1.0.0 &nbsp;·&nbsp; 45 MB &nbsp;·&nbsp; Android 8.0+
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => <FaStar key={i} className="w-4 h-4 text-amber-500" />)}
              </div>
              <span className="text-sm text-slate-700 font-semibold font-body">4.9 &nbsp;·&nbsp; 5k+ happy users</span>
            </div>
          </div>

          {/* ── Right: Phone + floating badges ── */}
          <div className="flex-1 flex justify-center lg:justify-end relative w-full">
            {/* Phone mockup */}
            <div className="relative z-10 w-full max-w-[260px] sm:max-w-[280px] lg:max-w-[300px] aspect-[9/19]">
              <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden ring-1 ring-slate-300 shadow-[0_40px_80px_rgba(0,0,0,0.15)] bg-white">
                <Image
                  src="/images/mobile-app-image.png"
                  alt="Toy Hourse App Preview"
                  fill
                  sizes="(max-width: 640px) 260px, (max-width: 1024px) 280px, 300px"
                  className="object-contain"
                  priority
                />
              </div>

              {/* Floating: Downloads */}
              <div className="absolute -top-4 -left-14 sm:-left-20 bg-white/95 backdrop-blur-xl border border-slate-200 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-20">
                <div className="bg-violet-100 w-9 h-9 flex items-center justify-center rounded-xl shrink-0">
                  <FaDownload className="w-4 h-4 text-violet-700" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm leading-none">5k+</p>
                  <p className="font-mono text-[10px] text-slate-600 font-semibold mt-0.5 uppercase tracking-wider">Downloads</p>
                </div>
              </div>

              {/* Floating: Verified */}
              <div className="absolute -bottom-4 -right-10 sm:-right-16 bg-white/95 backdrop-blur-xl border border-slate-200 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 z-20">
                <div className="bg-emerald-100 w-9 h-9 flex items-center justify-center rounded-xl shrink-0">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm leading-none">Verified</p>
                  <p className="font-mono text-[10px] text-slate-600 font-semibold mt-0.5 uppercase tracking-wider">Safe APK</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Features Strip ── */}
      <section className="relative z-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x divide-slate-200">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-5 py-4 sm:py-0 lg:px-6 first:pl-0 last:pr-0">
              <div className="shrink-0 w-11 h-11 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center">
                <Icon className="w-5 h-5 text-violet-700" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold uppercase text-slate-900 tracking-wide mb-1">{label}</h3>
                <p className="font-body text-sm text-slate-600 font-medium leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
