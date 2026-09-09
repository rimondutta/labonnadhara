// Thin re-export shim — state lives in src/store/searchStore.ts (Zustand).
"use client";
import React from "react";
export { useSearch } from "@/store/searchStore";

export default function SearchProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
