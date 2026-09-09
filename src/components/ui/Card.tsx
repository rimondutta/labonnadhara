"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border border-neutral-200 rounded-none overflow-hidden",
        onClick && "cursor-pointer hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      {children}
    </div>
  );
}
