"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

const OFFERS = [
  "30% Off and Free Shiping Every Deal",
  "Up to 50% Off on selected toys",
  "Buy 2 Get 1 Free on all Educational Toys this week",
];

export default function OfferBar() {
  const [currentOffer, setCurrentOffer] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full bg-paper-grey border-b border-rule-grey py-2 px-4 relative flex items-center justify-center gap-4">
      <button
        onClick={() => setCurrentOffer((p) => (p - 1 + OFFERS.length) % OFFERS.length)}
        className="hidden sm:block font-mono text-[14px] text-ink-black/50 hover:text-ink-black transition-colors leading-none"
        aria-label="Previous offer"
      >‹</button>

      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-black/90">
        {OFFERS[currentOffer]}
      </span>

      <button
        onClick={() => setCurrentOffer((p) => (p + 1) % OFFERS.length)}
        className="hidden sm:block font-mono text-[14px] text-ink-black/50 hover:text-ink-black transition-colors leading-none"
        aria-label="Next offer"
      >›</button>

      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-black/40 hover:text-ink-black transition-colors"
        aria-label="Close"
      >
        <X size={12} />
      </button>
    </div>
  );
}
