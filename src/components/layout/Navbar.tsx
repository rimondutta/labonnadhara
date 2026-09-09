"use client";

import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { useCart } from "@/components/providers/CartProvider";
import { useSearch } from "@/components/providers/SearchProvider";
import {
  IconHome,
  IconShoppingBag,
  IconSearch,
  IconShoppingCart,
  IconUser,
  IconHeart,
  IconArticle,
} from "@tabler/icons-react";

export default function Navbar() {
  const { openCart, count: cartCount } = useCart();
  const { openSearch } = useSearch();

  const links = [
    {
      title: "Home",
      icon: <IconHome className="h-5 w-5 text-black/60 hover:text-[#FFC93C] transition-colors duration-200" />,
      href: "/",
    },
    {
      title: "Shop",
      icon: <IconShoppingBag className="h-5 w-5 text-black/60 hover:text-[#4ECDC4] transition-colors duration-200" />,
      href: "/products",
    },
    {
      title: "Blog",
      icon: <IconArticle className="h-5 w-5 text-black/60 hover:text-[#FF6B5D] transition-colors duration-200" />,
      href: "/blogs",
    },
    {
      title: "Search",
      icon: <IconSearch className="h-5 w-5 text-black/60 hover:text-black transition-colors duration-200" />,
      onClick: openSearch,
    },
    {
      title: "Wishlist",
      icon: <IconHeart className="h-5 w-5 text-black/60 hover:text-[#FF6B5D] transition-colors duration-200" />,
      href: "/wishlist",
    },
    {
      title: "Cart",
      icon: (
        <div className="relative h-5 w-5 flex items-center justify-center">
          <IconShoppingCart className="h-5 w-5 text-black/60 hover:text-[#FFC93C] transition-colors duration-200" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#FFC93C] text-black font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-black leading-none">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </div>
      ),
      onClick: openCart,
    },
    {
      title: "Account",
      icon: <IconUser className="h-5 w-5 text-black/60 hover:text-black transition-colors duration-200" />,
      href: "/account",
    },
  ];

  return (
    <>
      {/* ═══ Floating Bottom Dock — Mobile Only ═══ */}
      <div className="md:hidden fixed bottom-5 left-0 right-0 flex justify-center z-[999] pointer-events-none px-4">
        <div className="pointer-events-auto w-full flex justify-center">
          <FloatingDock items={links} />
        </div>
      </div>
    </>
  );
}
