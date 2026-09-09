"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistState {
  items: string[];
  count: number;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
  toggleItem: (id: string) => void;
  isWishlisted: (id: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      get count() {
        return get().items.length;
      },

      addItem: (id) =>
        set((state) => ({
          items: state.items.includes(id) ? state.items : [...state.items, id],
        })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i !== id) })),

      toggleItem: (id) =>
        set((state) => ({
          items: state.items.includes(id)
            ? state.items.filter((i) => i !== id)
            : [...state.items, id],
        })),

      isWishlisted: (id) => get().items.includes(id),
    }),
    {
      name: "wishlist-storage",
    }
  )
);

// Backward-compatible alias
export function useWishlist() {
  const store = useWishlistStore();
  return {
    items: store.items,
    count: store.items.length,
    addItem: store.addItem,
    removeItem: store.removeItem,
    toggleItem: store.toggleItem,
    isWishlisted: store.isWishlisted,
  };
}
