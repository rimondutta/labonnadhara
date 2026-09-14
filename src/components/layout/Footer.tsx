"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IconBrandFacebook, IconBrandX, IconBrandInstagram, IconBrandYoutube } from "@tabler/icons-react";
import { ArrowRight } from "lucide-react";

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blogs" },
  { label: "Contact Us", href: "/contact" },
  { label: "Download App", href: "/download" },
];
const shopLinks = [
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "All Products", href: "/products" },
  { label: "Sale", href: "/products?sale=true" },
];
const helpLinks = [
  { label: "Customer Service", href: "#" },
  { label: "My Account", href: "/account" },
  { label: "Returns", href: "#" },
  { label: "Legal & Privacy", href: "#" },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setEmail("");
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer
      className="text-white pt-20 pb-0 overflow-hidden min-h-[60vh] flex flex-col justify-between mt-20 relative bg-black"
      style={{
        backgroundImage: "radial-gradient(125% 125% at 50% 100%, #000000 40%, #350136 100%)",
        backgroundSize: "100% 100%"
      }}
      suppressHydrationWarning
    >

      {/* ─── Top Grid (Links & Socials) ─── */}
      <div className="px-4 sm:px-8 lg:px-[5vw] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 relative z-10">

        {/* Shop Links */}
        <div className="flex flex-col gap-3">
          <h5 className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1">Shop</h5>
          {shopLinks.map(link => (
            <Link key={link.label} href={link.href} className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-bold">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Company Links */}
        <div className="flex flex-col gap-3">
          <h5 className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1">Company</h5>
          {companyLinks.map(link => (
            <Link key={link.label} href={link.href} className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-bold">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Help Links */}
        <div className="flex flex-col gap-3">
          <h5 className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-white/80 mb-1">Help</h5>
          {helpLinks.map(link => (
            <Link key={link.label} href={link.href} className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-bold">
              {link.label}
            </Link>
          ))}
        </div>

        {/* Socials - Horizontal */}
        <div className="lg:col-span-2 flex flex-wrap gap-x-8 gap-y-4 md:justify-end content-start">
          <a href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-black">LinkedIn</a>
          <a href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-black">X</a>
          <a href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-black">Instagram</a>
          <a href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 transition-colors font-black">YouTube</a>
        </div>
      </div>

      {/* ─── Bottom Section (Copyright & Huge Text) ─── */}
      <div className="mt-20">
        {/* Fine Print Row */}
        <div className="px-4 sm:px-8 lg:px-[5vw] flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white font-bold">
              © {new Date().getFullYear()} Labonnadhara. All Rights Reserved.
            </p>
            <span className="hidden sm:inline text-white/40">·</span>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/80 font-semibold">
              Developed by{" "}
              <a
                href="https://www.facebook.com/dutta.rimon/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-gray-300 underline underline-offset-4 transition-colors"
              >
                Rimon Dutta
              </a>
            </p>
          </div>
          <div className="flex gap-8">
            <Link href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 font-bold">Terms & Conditions</Link>
            <Link href="#" className="font-mono text-[11px] uppercase tracking-[0.1em] text-white hover:text-white/70 font-bold">Privacy Policy</Link>
          </div>
        </div>

        {/* Massive Text Overlay */}
        <div className="w-full flex justify-center pb-2">
          <h1 className="font-sans font-black text-[12vw] sm:text-[12vw] text-white leading-none tracking-tighter m-0 p-0 text-center w-full">
            Labonnadhara
          </h1>
        </div>
      </div>

    </footer>
  );
}