// Thin re-export shim — state lives in src/store/wishlistStore.ts (Zustand).
"use client";
import React from "react";
export { useWishlist } from "@/store/wishlistStore";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
