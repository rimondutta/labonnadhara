"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Button({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors duration-200 cursor-pointer border",
        // variants
        variant === "default" && "bg-[#043224] text-white border-[#043224] hover:bg-[#043224]/90",
        variant === "outline" && "bg-transparent text-black border-black hover:bg-black hover:text-white",
        variant === "ghost" && "bg-transparent text-black border-transparent hover:bg-neutral-100",
        // sizes
        size === "sm" && "text-xs px-3 py-2",
        size === "md" && "text-sm px-5 py-3",
        size === "lg" && "text-base px-8 py-4",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
