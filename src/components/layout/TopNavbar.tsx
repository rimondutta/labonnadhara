"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/providers/CartProvider";
import { useSearch } from "@/components/providers/SearchProvider";
import { useUIStore } from "@/store/uiStore";

/* ─────────────────────────────────────────
   SVG icon helpers
───────────────────────────────────────── */
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const HeartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const BagIcon = () => (
  <svg fill="#000000" height="20px" width="20px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="0 0 489 489" xmlSpace="preserve">
    <g>
      <path d="M440.1,422.7l-28-315.3c-0.6-7-6.5-12.3-13.4-12.3h-57.6C340.3,42.5,297.3,0,244.5,0s-95.8,42.5-96.6,95.1H90.3
		c-7,0-12.8,5.3-13.4,12.3l-28,315.3c0,0.4-0.1,0.8-0.1,1.2c0,35.9,32.9,65.1,73.4,65.1h244.6c40.5,0,73.4-29.2,73.4-65.1
		C440.2,423.5,440.2,423.1,440.1,422.7z M244.5,27c37.9,0,68.8,30.4,69.6,68.1H174.9C175.7,57.4,206.6,27,244.5,27z M366.8,462
		H122.2c-25.4,0-46-16.8-46.4-37.5l26.8-302.3h45.2v41c0,7.5,6,13.5,13.5,13.5s13.5-6,13.5-13.5v-41h139.3v41
		c0,7.5,6,13.5,13.5,13.5s13.5-6,13.5-13.5v-41h45.2l26.9,302.3C412.8,445.2,392.1,462,366.8,462z"/>
    </g>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/* ─────────────────────────────────────────
   TopNavbar
───────────────────────────────────────── */
export default function TopNavbar() {
  const { openCart, count: cartCount } = useCart();
  const { openSearch } = useSearch();
  const { openMobileMenu } = useUIStore();
  const pathname = usePathname();

  const [mounted, setMounted] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSearch]);

  const navLinks = [
    { label: "HOME", href: "/" },
    { label: "SHOP", href: "/products" },
    { label: "ABOUT", href: "/about" },
    { label: "CONTACT", href: "/contact" },
  ];

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: scrolled ? "rgba(255,241,246,0.97)" : "rgba(255,241,246,0.97)",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 4px 24px rgba(214,43,114,0.10)" : "0 2px 12px rgba(214,43,114,0.06)",
          transition: "box-shadow 0.3s ease, background-color 0.3s ease",
        }}
        suppressHydrationWarning
      >
        {/* ── Announcement / Top Bar ── */}
        <div className="bg-[#D62B72] text-white text-[11px] sm:text-[12px] font-semibold tracking-wide px-4 md:px-7 py-2 flex flex-row items-center justify-between gap-2">
          {/* Left: Delivery info */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <svg width="18" height="18" className="md:w-[22px] md:h-[22px]" viewBox="0 0 50 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M33 8H5a2 2 0 0 0-2 2v22h2" />
              <path d="M3 32h30V10" />
              <path d="M33 18h8l6 8v6h-4" />
              <path d="M33 32h10" />
              <circle cx="13" cy="35" r="4" />
              <circle cx="39" cy="35" r="4" />
              <path d="M9 32H3" />
              <line x1="8" y1="14" x2="18" y2="14" />
              <line x1="5" y1="20" x2="18" y2="20" />
              <line x1="8" y1="26" x2="18" y2="26" />
            </svg>
            <span className="truncate max-w-[200px] sm:max-w-none">Fast Delivery: ঢাকা ও চট্টগ্রাম</span>
          </div>

          {/* Center: Features (Hidden on mobile to save space) */}
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-center">
            <span className="flex items-center gap-1.5">
              <span>✨</span> Premium Packaging
            </span>
            <span className="opacity-50">|</span>
            <span className="flex items-center gap-1.5">
              <span>🔒</span> Secure Payment
            </span>
            <span className="opacity-50">|</span>
            <span className="flex items-center gap-1.5">
              <span>🔄</span> Easy Exchange
            </span>
          </div>

          {/* Right: Social links */}
          <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
            <span className="hidden sm:inline">Follow Us:</span>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="Facebook">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="Instagram">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            </a>
            <a href="https://wa.me/8801616921965" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white transition-colors" aria-label="WhatsApp">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            </a>
          </div>
        </div>

        {/* Top accent line */}
        <div style={{ height: 2, background: "linear-gradient(to right, transparent, #E86A9B 30%, #D62B72 60%, #C9A24D 80%, transparent)" }} />

        {/* Main row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto", padding: "0 28px", height: 90, position: "relative" }}>

          {/* ── LEFT Logo ── */}
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Link href="/" className="lbn-logo" aria-label="Labonnadhara home">
              <Image
                src="/logo/labonnadhara-logo.png"
                alt="Labonnadhara"
                width={120}
                height={60}
                className="lbn-logo-img"
                priority
              />
            </Link>
          </div>

          {/* ── CENTER Menu ── */}
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center" }}>
            <div className="lbn-links">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link key={link.label} href={link.href} className={`lbn-link${isActive ? " lbn-link-active" : ""}`}>
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT Icons ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "flex-end" }}>
            <button onClick={openSearch} className="lbn-icon-btn" aria-label="Search"><SearchIcon /></button>
            <Link href="/wishlist" className="lbn-icon-btn lbn-desktop-only" aria-label="Wishlist"><HeartIcon /></Link>
            <button onClick={openCart} className="lbn-icon-btn" style={{ position: "relative" }} aria-label="Cart">
              <BagIcon />
              {mounted && cartCount > 0 && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  background: "#D62B72", color: "#FFFFFF",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700,
                  width: 15, height: 15, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1.5px solid #FFF1F6", lineHeight: 1,
                }}>
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            <Link href="/account" className="lbn-icon-btn lbn-desktop-only" aria-label="My account"><UserIcon /></Link>
            {/* Mobile hamburger now on the right */}
            <button onClick={openMobileMenu} className="lbn-icon-btn lbn-mobile-only" aria-label="Open menu">
              <MenuIcon />
            </button>
          </div>
        </div>


      </nav>

      {/* ── Scoped styles ── */}
      <style>{`
        /* Google Fonts import */
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap');

        /* Logo */
        .lbn-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          pointer-events: auto;
          transition: opacity 0.22s ease;
          line-height: 1;
        }
        .lbn-logo:hover { opacity: 0.75; }
        .lbn-logo-img {
          height: 72px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        /* Vertical dividers */
        .lbn-divider {
          display: block;
          width: 1px;
          height: 24px;
          background: rgba(90,81,71,0.22);
          flex-shrink: 0;
        }

        /* Nav links container */
        .lbn-links {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .lbn-link {
          font-family: 'DM Sans', sans-serif;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.13em;
          color: #4B5563;
          text-decoration: none;
          padding: 6px 10px;
          position: relative;
          transition: color 0.22s ease;
        }
        .lbn-link::after {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 10px;
          right: 10px;
          height: 1.5px;
          background: #D62B72;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.28s cubic-bezier(0.25,1,0.5,1);
        }
        .lbn-link:hover, .lbn-link-active { color: #D62B72; }
        .lbn-link:hover::after, .lbn-link-active::after { transform: scaleX(1); }

        /* Icon button */
        .lbn-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #4B5563;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.2s ease, background 0.2s ease, transform 0.18s ease;
          flex-shrink: 0;
        }
        .lbn-icon-btn:hover {
          color: #D62B72;
          background: rgba(214,43,114,0.08);
          transform: translateY(-1px);
        }
        .lbn-icon-btn:active { transform: scale(0.94); }

        /* Responsive helpers */
        @media (min-width: 768px) {
          .lbn-mobile-only { display: none !important; }
        }
        @media (max-width: 767px) {
          .lbn-desktop-only { display: none !important; }
          .lbn-links { display: none !important; }
          .lbn-logo-img { height: 56px; }
        }
      `}</style>
    </>
  );
}