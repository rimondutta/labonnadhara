"use client";

import dynamic from "next/dynamic";
import { useSearch } from "@/components/providers/SearchProvider";

const CartDrawer = dynamic(() => import("@/components/playshelf/CartDrawer"), { ssr: false });
const SearchDrawer = dynamic(() => import("@/components/ui/SearchDrawer"), { ssr: false });
const QuickLookDrawer = dynamic(() => import("@/components/ui/QuickLookDrawer"), { ssr: false });
const MobileMenu = dynamic(() => import("@/components/layout/MobileMenu"), { ssr: false });
const Chatbot = dynamic(() => import("@/components/Chatbot"), { ssr: false });

export default function GlobalUI() {
  const { isOpen: isSearchOpen, closeSearch } = useSearch();

  return (
    <>
      <CartDrawer />
      <SearchDrawer isOpen={isSearchOpen} onClose={closeSearch} />
      <QuickLookDrawer />
      <MobileMenu />
      <Chatbot />
    </>
  );
};
