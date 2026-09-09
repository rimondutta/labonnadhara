"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  id: string;
  variantId?: string;
  slug: string;
  title: string;
  price: number;
  quantity: number;
  variantOptions?: Record<string, string>; // e.g. { Color: "Red", Size: "M", Pieces: "10" }
  image: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (id: string, variantId?: string, variantOptions?: Record<string, string>) => void;
  updateQuantity: (id: string, qty: number, variantId?: string, variantOptions?: Record<string, string>) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  clearCart: () => void;
}

const areItemsEqual = (i1: CartItem, i2: Partial<CartItem>) => {
  if (i1.id !== i2.id) return false;
  if (i1.variantId || i2.variantId) {
     return i1.variantId === i2.variantId;
  }
  // Fallback to legacy options comparison if no variantId
  const opt1 = i1.variantOptions;
  const opt2 = i2.variantOptions;
  if (!opt1 && !opt2) return true;
  if (!opt1 || !opt2) return false;
  const keys1 = Object.keys(opt1);
  const keys2 = Object.keys(opt2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every(key => opt1[key] === opt2[key]);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find(
            (i) => areItemsEqual(i, item)
          );
          const newItems = existing
            ? state.items.map((i) =>
                areItemsEqual(i, item)
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              )
            : [...state.items, item];
          return { items: newItems, isOpen: true };
        });
      },

      removeItem: (id, variantId, variantOptions) => {
        set((state) => ({
          items: state.items.filter((i) => !areItemsEqual(i, { id, variantId, variantOptions })),
        }));
      },

      updateQuantity: (id, qty, variantId, variantOptions) => {
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => !areItemsEqual(i, { id, variantId, variantOptions }))
              : state.items.map((i) =>
                  areItemsEqual(i, { id, variantId, variantOptions })
                    ? { ...i, quantity: qty }
                    : i
                ),
        }));
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      clearCart: () => set({ items: [], isOpen: false }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      }),
      partialize: (state) => ({ items: state.items }), // Only persist items, not isOpen state
    }
  )
);

// ── Backward-compatible aliases (replaces useCart() from CartProvider) ──
export function useCart() {
  const store = useCartStore();
  return {
    items: store.items,
    count: store.items.reduce((s, i) => s + i.quantity, 0),
    total: store.items.reduce((s, i) => s + i.price * i.quantity, 0),
    isOpen: store.isOpen,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    openCart: store.openCart,
    closeCart: store.closeCart,
    toggleCart: store.toggleCart,
    clearCart: store.clearCart,
  };
}
