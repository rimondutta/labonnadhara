"use client";

import React from "react";
import ProductCardAwwwards from "./product-card-nike";
import Link from "next/link";

export interface Product {
  _id: string;
  title: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: { url: string; alt?: string }[];
  badge?: string;
  ageRange?: string;
  rating?: number;
  reviewCount?: number;
  category?: any;
  inventory?: number;
}

interface ProductGridProps {
  products: Product[];
  title?: React.ReactNode;
  subtitle?: string;
  viewAllLink?: string;
  layout?: "carousel" | "grid";
  theme?: "dark" | "light";
}

export default function ProductGridNike({
  products,
  title,
  subtitle,
  viewAllLink = "/products",
}: ProductGridProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className="w-full flex flex-col items-center gap-10 md:gap-14">
      {/* Optional Header Section */}
      {(title || subtitle) && (
        <div className="w-full flex flex-col items-center text-center gap-2">
          {title && (
            <div className="font-display font-bold text-2xl md:text-3xl text-joy-navy tracking-tight">
              {title}
            </div>
          )}
          {subtitle && (
            <p className="font-body text-sm md:text-base text-gray-500 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Grid Layout */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {products.map((product, idx) => (
          <ProductCardAwwwards
            key={product._id}
            product={product}
            priority={idx < 2}
            index={idx + 1}
          />
        ))}
      </div>

      {/* View All Button */}
      {viewAllLink && (
        <Link
          href={viewAllLink}
          className="group relative inline-flex items-center gap-2 font-display font-bold text-sm text-joy-navy hover:text-joy-cobalt transition-colors"
        >
          <span>View All Products</span>
          <span className="group-hover:translate-x-1 transition-transform duration-300">
            →
          </span>
        </Link>
      )}
    </div>
  );
}