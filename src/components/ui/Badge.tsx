"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "sale" | "new" | "outline";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full",
        variant === "default" && "bg-black text-white",
        variant === "sale"    && "bg-red-500 text-white",
        variant === "new"     && "bg-black text-white",
        variant === "outline" && "border border-black text-black bg-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}
