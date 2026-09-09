import React from "react";
import { cn } from "@/lib/utils";

interface IndexTagProps {
  index: number | string;
  category?: string;
  className?: string;
}

/**
 * Signature "catalog entry" tag — N°014 — VEHICLES
 * Sits at -4° at rest, animates to 0° on parent group hover.
 * The index is real: pass the product's grid position (1-based).
 */
export default function IndexTag({ index, category, className }: IndexTagProps) {
  const padded =
    typeof index === "number" ? index.toString().padStart(3, "0") : index;

  return (
    <span
      className={cn(
        "font-display text-ink-black uppercase leading-none select-none",
        "transform -rotate-[4deg] origin-top-left",
        "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-hover:rotate-0",
        className
      )}
    >
      N°{padded}{category ? ` — ${category.toUpperCase()}` : ""}
    </span>
  );
}
