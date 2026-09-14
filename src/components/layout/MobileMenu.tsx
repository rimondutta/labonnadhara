"use client";

import React from "react";
import Link from "next/link";
import { m, AnimatePresence, useReducedMotion } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const navItems = [
  { num: "01", label: "SHOP", href: "/products" },
  { num: "02", label: "ABOUT", href: "/about" },
  { num: "03", label: "BLOG", href: "/blogs" },
  { num: "04", label: "APP DOWNLOAD", href: "/download" },
  { num: "05", label: "CONTACT", href: "/contact" },
  { num: "06", label: "ACCOUNT", href: "/account" },
  { num: "07", label: "WISHLIST", href: "/wishlist" },
];

export default function MobileMenu() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore();
  const reduced = useReducedMotion() ?? false;

  const container: any = {
    hidden: {},
    visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.1 } },
  };
  const item: any = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0, transition: { ease: [0.25, 1, 0.5, 1], duration: 0.55 } },
  };

  return (
    <AnimatePresence>
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000]"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Drawer — clean white panel */}
          <m.div
            key="drawer"
            initial={{ x: reduced ? 0 : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduced ? 0 : "-100%", opacity: reduced ? 0 : 1 }}
            transition={{ ease: [0.25, 1, 0.5, 1] as any, duration: reduced ? 0.15 : 0.6 }}
            className="fixed inset-y-0 left-0 w-[85vw] max-w-sm z-[1001] bg-white/95 backdrop-blur-2xl flex flex-col overflow-hidden border-r border-black/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-black/10">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className="font-serif text-[22px] uppercase tracking-[-0.02em] text-black"
              >
                LABONNADHARA
              </Link>
              <button
                onClick={closeMobileMenu}
                className="text-black/70 hover:text-black transition-colors"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Index-numbered nav items */}
            <m.nav
              className="flex-1 overflow-y-auto px-6 py-8"
              variants={container}
              initial="hidden"
              animate="visible"
            >
              {navItems.map((link) => (
                <m.div key={link.num} variants={item}>
                  <Link
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="group flex items-baseline gap-4 py-4 border-b border-black/5 last:border-0"
                  >
                    <span className="font-mono text-[11px] text-gray-400 w-6 shrink-0">
                      {link.num}
                    </span>
                    <span className="font-display text-[28px] uppercase text-black leading-none tracking-[-0.02em] group-hover:text-gray-500 transition-colors duration-200">
                      {link.label}
                    </span>
                  </Link>
                </m.div>
              ))}
            </m.nav>

            {/* Footer strip */}
            <div className="px-6 py-4 border-t border-black/10">
              <p className="font-mono text-[10px] text-black/40 uppercase tracking-[0.1em]">
                © {new Date().getFullYear()} LABONNADHARA
              </p>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};
