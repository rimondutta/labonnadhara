"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import AnimatedReveal from "@/components/ui/AnimatedReveal";
import { FaApple, FaGooglePlay, FaGithub } from "react-icons/fa";

export default function AppDownloadSection() {
  return (
    <AnimatedReveal>
      <section className="px-4 sm:px-10 lg:px-[5vw] py-16 md:py-24 bg-white text-black relative overflow-hidden border-t border-black/10">

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20 max-w-7xl mx-auto">

          {/* Text Content */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-slate-700">
                  Experience More
                </p>
                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 font-mono text-[10px] font-bold uppercase px-3 py-1 rounded-full">
                  100% Open Source
                </span>
              </div>
              <h2 className="font-serif font-bold text-4xl sm:text-5xl lg:text-6xl text-slate-900 leading-[1.1] tracking-tight">
                Shop Anywhere, <br className="hidden lg:block" />
                <span className="italic text-violet-700 font-normal">Anytime.</span>
              </h2>
            </div>

            <p className="font-body font-medium text-base lg:text-lg text-slate-700 max-w-md mx-auto lg:mx-0 leading-[1.7]">
              Download our 100% open-source mobile app for exclusive deals, early access to new arrivals, and a seamless, transparent shopping experience on the go.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <Link
                href="/download"
                className="group flex items-center gap-4 bg-[#D5AEFD] text-slate-900 border border-[#D5AEFD] px-8 py-4 hover:bg-[#D5AEFD]/90 transition-colors duration-300 w-full sm:w-auto justify-center rounded-2xl shadow-sm"
              >
                <FaApple className="w-6 h-6" />
                <div className="flex flex-col items-start">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider leading-none opacity-80">Download on the</span>
                  <span className="font-body text-sm font-bold uppercase tracking-widest leading-tight">App Store</span>
                </div>
              </Link>

              <Link
                href="/download"
                className="group flex items-center gap-4 bg-transparent border border-[#D5AEFD] text-slate-900 px-8 py-4 hover:bg-[#D5AEFD] transition-colors duration-300 w-full sm:w-auto justify-center rounded-2xl"
              >
                <FaGooglePlay className="w-5 h-5" />
                <div className="flex flex-col items-start">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider leading-none opacity-80">GET IT ON</span>
                  <span className="font-body text-sm font-bold uppercase tracking-widest leading-tight">Google Play</span>
                </div>
              </Link>

              <a
                href="https://github.com/rimondutta/toyhourse-mobile-app"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 bg-slate-900 text-white px-8 py-4 hover:bg-slate-800 transition-colors duration-300 w-full sm:w-auto justify-center rounded-2xl shadow-sm"
              >
                <FaGithub className="w-5 h-5 text-white" />
                <div className="flex flex-col items-start">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider leading-none text-slate-400">View Source Code</span>
                  <span className="font-body text-sm font-bold uppercase tracking-widest leading-tight text-white">GitHub Repo</span>
                </div>
              </a>
            </div>

            <div className="pt-8 flex items-center justify-center lg:justify-start gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-zinc-200 overflow-hidden relative shadow-sm" style={{ position: 'relative' }}>
                    <Image src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" fill sizes="40px" className="object-cover" />
                  </div>
                ))}
              </div>
              <div className="text-sm font-body font-semibold text-slate-700">
                <span className="font-serif italic font-bold text-slate-900 text-lg">10k+</span> happy users
              </div>
            </div>
          </div>

          {/* App Mockup / Visual */}
          <div className="flex-1 relative w-full max-w-[400px] lg:max-w-none flex justify-center lg:justify-end">
            <AnimatedReveal direction="up" delay={0.2} className="w-full flex justify-center lg:justify-end">
              <div
                className="relative w-full max-w-[300px] lg:max-w-[340px] aspect-[9/19] rounded-[3rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] bg-white border border-black/5"
              >
                <Image
                  src="/images/mobile-app-image.png"
                  alt="App Screenshot"
                  fill
                  sizes="(max-width: 768px) 300px, 340px"
                  className="object-contain"
                />
              </div>
            </AnimatedReveal>
          </div>

        </div>
      </section>
    </AnimatedReveal>
  );
}

