"use client";

import { Fragment } from "react";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import Image from "next/image";
import { useCart } from "@/components/providers/CartProvider";
import Link from "next/link";
import QuantityStepper from "./QuantityStepper";

const FREE_SHIPPING_THRESHOLD = 2000;

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, count } = useCart();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const pct = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={closeCart} className="relative z-[1000]">

        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink-black/40" aria-hidden="true" onClick={closeCart} />
        </TransitionChild>

        {/* Panel */}
        <TransitionChild
          as={Fragment}
          enter="transform transition duration-[500ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition duration-[400ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-paper-white/95 backdrop-blur-2xl border-l border-rule-grey flex flex-col overflow-hidden">

            {/* ─── Header ─── */}
            <div className="flex items-start justify-between px-6 pt-8 pb-6 border-b border-rule-grey">
              <div>
                <h2 className="font-display text-[32px] uppercase text-ink-black leading-none tracking-[-0.01em]">
                  Your Cart
                </h2>
                <p className="font-mono text-[11px] text-rule-black uppercase tracking-[0.12em] mt-1">
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                onClick={closeCart}
                className="text-ink-black hover:text-rule-grey transition-colors mt-1"
                aria-label="Close cart"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* ─── Free shipping progress ─── */}
            {remaining > 0 && (
              <div className="px-6 py-4 border-b border-rule-grey">
                <p className="font-mono text-[10px] text-ink-black uppercase tracking-[0.1em] mb-2">
                  Add <strong className="text-stamp-red">৳{remaining.toLocaleString()}</strong> for free shipping
                </p>
                <div className="h-[1px] w-full bg-rule-grey relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-ink-black transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* ─── Cart Items — "receipt" rows ─── */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-6 px-6 text-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-rule-grey">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  <p className="font-body text-[14px] text-[#043224]">Your cart is empty.</p>
                  <button
                    onClick={closeCart}
                    className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#043224] border border-[#043224] px-5 py-2.5 hover:bg-[#043224]/90 hover:text-white transition-colors cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={`${item.id}-${JSON.stringify(item.variantOptions)}`}
                    className="flex gap-4 px-6 py-5 border-b border-rule-grey"
                  >
                    {/* Thumbnail — flat, no radius */}
                    <div className="w-[72px] h-[90px] relative shrink-0 bg-paper-grey overflow-hidden">
                      <Image src={item.image} alt={item.title} fill className="object-cover" sizes="72px" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between py-0.5">
                      <div>
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="font-body text-[13px] text-ink-black leading-snug line-clamp-2 hover:text-rule-grey transition-colors"
                        >
                          {item.title}
                        </Link>
                        {Object.keys(item.variantOptions || {}).length > 0 && (
                          <p className="font-mono text-[10px] text-rule-grey uppercase tracking-[0.08em] mt-0.5">
                            {Object.entries(item.variantOptions || {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Flat text-based quantity stepper */}
                        <div className="flex items-center gap-0">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), item.variantId, item.variantOptions)}
                            className="font-mono text-[16px] text-ink-black w-7 h-7 flex items-center justify-center border border-rule-grey hover:border-ink-black transition-colors leading-none"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <span className="font-mono text-[12px] text-ink-black w-8 h-7 flex items-center justify-center border-y border-rule-grey">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId, item.variantOptions)}
                            className="font-mono text-[16px] text-ink-black w-7 h-7 flex items-center justify-center border border-rule-grey hover:border-ink-black transition-colors leading-none"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-mono text-[13px] text-ink-black">
                          ৳{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id, item.variantId, item.variantOptions)}
                      className="self-start mt-0.5 text-rule-grey hover:text-stamp-red transition-colors"
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* ─── Checkout Footer ─── */}
            {items.length > 0 && (
              <div className="border-t border-rule-grey px-6 py-6 space-y-4 bg-paper-grey">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#043224]">Subtotal</span>
                  <span className="font-mono text-[20px] text-[#043224]">৳{total.toLocaleString()}</span>
                </div>
                <p className="font-mono text-[10px] text-[#043224] uppercase tracking-[0.08em]">
                  Shipping & taxes calculated at checkout.
                </p>
                <Link href="/checkout" onClick={closeCart} className="block">
                  <button className="w-full bg-[#043224] text-white font-mono text-[11px] uppercase tracking-[0.15em] py-4 hover:bg-[#043224]/90 hover:text-white transition-colors cursor-pointer duration-200">
                    Proceed to Checkout →
                  </button>
                </Link>
              </div>
            )}
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
