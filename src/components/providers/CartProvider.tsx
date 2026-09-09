// This file is now a thin re-export shim.
// State lives in src/store/cartStore.ts (Zustand).
// All existing imports of `useCart` / `CartProvider` continue to work.
"use client";
import React from "react";
export type { CartItem } from "@/store/cartStore";
export { useCart } from "@/store/cartStore";

/** CartProvider is kept for backward compatibility — it is now a passthrough. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
