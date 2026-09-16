"use client";

import React from "react";
import Link from "next/link";

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blogs" },
  { label: "Contact Us", href: "/contact" },
  { label: "Our Stores", href: "#" },
];
const shopLinks = [
  { label: "New Arrivals", href: "/products?sort=newest" },
  { label: "Necklaces", href: "/products?category=necklaces" },
  { label: "Earrings", href: "/products?category=earrings" },
  { label: "All Products", href: "/products" },
];
const helpLinks = [
  { label: "Customer Service", href: "#" },
  { label: "My Account", href: "/account" },
  { label: "Returns & Exchanges", href: "#" },
  { label: "Shipping Policy", href: "#" },
];

export default function Footer() {
  return (
    <footer
      className="bg-[#FFF0F5] border-t border-[#F3D6E2] pt-16 md:pt-24 pb-8 overflow-hidden relative"
      suppressHydrationWarning
    >
      <div className="px-4 sm:px-8 lg:px-[5vw] max-w-[1400px] mx-auto relative z-10">
        
        {/* ─── Top Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16 md:mb-24">
          
          {/* Brand & Newsletter */}
          <div className="lg:col-span-4 xl:col-span-5 flex flex-col gap-6">
            <Link href="/" className="inline-block">
              <h2 className="font-serif font-bold text-3xl md:text-4xl text-[#D62B72] tracking-tight">
                Labonnadhara
              </h2>
            </Link>
            <p className="font-sans text-[14px] md:text-[15px] text-[#4B5563] leading-relaxed max-w-sm">
              Discover the finest collection of premium jewelry. Elegant designs crafted for your unforgettable moments.
            </p>
            
            <div className="flex gap-3 mt-2">
              <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#D62B72] hover:bg-[#D62B72] hover:text-white transition-colors shadow-sm">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#D62B72] hover:bg-[#D62B72] hover:text-white transition-colors shadow-sm">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#D62B72] hover:bg-[#D62B72] hover:text-white transition-colors shadow-sm">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8 xl:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Shop */}
            <div className="flex flex-col gap-5">
              <h5 className="font-serif font-bold text-[20px] text-[#252B3A]">Shop</h5>
              <div className="flex flex-col gap-3.5">
                {shopLinks.map(link => (
                  <Link key={link.label} href={link.href} className="font-sans text-[14px] md:text-[15px] font-medium text-[#4B5563] hover:text-[#D62B72] transition-colors w-max">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Company */}
            <div className="flex flex-col gap-5">
              <h5 className="font-serif font-bold text-[20px] text-[#252B3A]">Company</h5>
              <div className="flex flex-col gap-3.5">
                {companyLinks.map(link => (
                  <Link key={link.label} href={link.href} className="font-sans text-[14px] md:text-[15px] font-medium text-[#4B5563] hover:text-[#D62B72] transition-colors w-max">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="flex flex-col gap-5">
              <h5 className="font-serif font-bold text-[20px] text-[#252B3A]">Help</h5>
              <div className="flex flex-col gap-3.5">
                {helpLinks.map(link => (
                  <Link key={link.label} href={link.href} className="font-sans text-[14px] md:text-[15px] font-medium text-[#4B5563] hover:text-[#D62B72] transition-colors w-max">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Bottom Section ─── */}
        <div className="pt-8 border-t border-[#F3D6E2]/80 flex flex-col md:flex-row justify-between items-center gap-4 relative z-20">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-2 text-center sm:text-left">
            <p className="font-sans text-[13px] md:text-[14px] text-[#4B5563] font-medium">
              © {new Date().getFullYear()} Labonnadhara. All Rights Reserved.
            </p>
            <span className="hidden sm:inline text-[#D62B72]/30">|</span>
            <p className="font-sans text-[13px] md:text-[14px] text-[#4B5563] font-medium">
              Developed by{" "}
              <a
                href="https://www.facebook.com/dutta.rimon/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-[#D62B72] hover:text-[#C51F63] underline-offset-4 hover:underline transition-colors"
              >
                Rimon Dutta
              </a>
            </p>
          </div>
          <div className="flex gap-6">
            <Link href="#" className="font-sans text-[13px] md:text-[14px] font-medium text-[#4B5563] hover:text-[#D62B72] transition-colors">Terms & Conditions</Link>
            <Link href="#" className="font-sans text-[13px] md:text-[14px] font-medium text-[#4B5563] hover:text-[#D62B72] transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>

      {/* Background Watermark */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none select-none flex justify-center opacity-30 z-0">
        <h1 className="font-serif font-black text-[18vw] text-[#F3D6E2] whitespace-nowrap m-0 p-0 leading-[0.75]">
          Labonnadhara
        </h1>
      </div>
    </footer>
  );
}