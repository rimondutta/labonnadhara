"use client";

import dynamic from "next/dynamic";
import { useSearch } from "@/components/providers/SearchProvider";
import { useEffect, useState } from "react";

const CartDrawer = dynamic(() => import("@/components/playshelf/CartDrawer"), { ssr: false });
const SearchDrawer = dynamic(() => import("@/components/ui/SearchDrawer"), { ssr: false });
const QuickLookDrawer = dynamic(() => import("@/components/ui/QuickLookDrawer"), { ssr: false });
const MobileMenu = dynamic(() => import("@/components/layout/MobileMenu"), { ssr: false });
// Chatbot is loaded lazily — only after first user interaction (scroll/click/touch)
// This removes lottie-react + ai-sdk + react-markdown from the initial JS bundle.
const Chatbot = dynamic(() => import("@/components/Chatbot"), { ssr: false });

export default function GlobalUI() {
  const { isOpen: isSearchOpen, closeSearch } = useSearch();
  const [chatbotReady, setChatbotReady] = useState(false);

  useEffect(() => {
    // Load Chatbot on first interaction — removes heavy AI/Lottie deps from critical path
    const activate = () => {
      setChatbotReady(true);
      window.removeEventListener("scroll", activate);
      window.removeEventListener("mousemove", activate);
      window.removeEventListener("touchstart", activate);
      window.removeEventListener("keydown", activate);
    };
    window.addEventListener("scroll", activate, { passive: true });
    window.addEventListener("mousemove", activate, { passive: true });
    window.addEventListener("touchstart", activate, { passive: true });
    window.addEventListener("keydown", activate, { passive: true });
    return () => {
      window.removeEventListener("scroll", activate);
      window.removeEventListener("mousemove", activate);
      window.removeEventListener("touchstart", activate);
      window.removeEventListener("keydown", activate);
    };
  }, []);

  return (
    <>
      <CartDrawer />
      <SearchDrawer isOpen={isSearchOpen} onClose={closeSearch} />
      <QuickLookDrawer />
      <MobileMenu />
      {chatbotReady && <Chatbot />}
    </>
  );
};

