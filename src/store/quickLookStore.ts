"use client";
import { create } from "zustand";

interface QuickLookState {
  isOpen: boolean;
  product: any | null;
  openQuickLook: (product: any) => void;
  closeQuickLook: () => void;
}

export const useQuickLookStore = create<QuickLookState>()((set) => ({
  isOpen: false,
  product: null,
  openQuickLook: (product) => set({ isOpen: true, product }),
  closeQuickLook: () => set({ isOpen: false, product: null }),
}));

export function useQuickLook() {
  return useQuickLookStore();
}
