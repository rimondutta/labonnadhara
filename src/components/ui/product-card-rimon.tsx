"use client";

import React, { useState } from "react";
import { trackAddToCart } from "@/lib/fbPixel";
import Link from "next/link";
import Image from "next/image";

import { useCart } from "@/components/providers/CartProvider";
import { useWishlist } from "@/store/wishlistStore";
import { cn, getOptimizedCloudinaryUrl } from "@/lib/utils";
import { Heart } from "lucide-react";

interface Product {
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
  colors?: any[];
  sizes?: any[];
  category?: any;
  inventory?: number;
  hasVariations?: boolean;
  variants?: any[];
}

interface Props {
  product: Product;
  priority?: boolean;
  index?: number;
}

function formatPrice(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function ProductCardModern({ product, priority = false, index = 1 }: Props) {
  const { addItem, openCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);

  const wishlisted = isWishlisted(product._id);
  const isOutOfStock = product.hasVariations && product.variants && product.variants.length > 0
    ? product.variants.every((v: any) => !v.isActive || v.stock <= 0)
    : product.inventory !== undefined && product.inventory <= 0;

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(product._id);
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    setIsAdding(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    addItem({
      id: product._id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      quantity: 1,
      image: product.images?.[0]?.url || "/placeholder.jpg",
    });
    setIsAdding(false);

    try {
      trackAddToCart(product, 1);
    } catch { /* noop */ }

    openCart();
  };

  // Database discount calculation logic
  const hasDiscount = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);

  const discountPercentage = hasDiscount && product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  const rawFront = product.images?.[0];
  const rawBack = product.images?.[1];
  // Inject f_auto,q_auto into Cloudinary URLs — served as WebP/AVIF, ~40% smaller
  const frontImg = rawFront ? { ...rawFront, url: getOptimizedCloudinaryUrl(rawFront.url, { width: 600 }) } : undefined;
  const backImg = rawBack ? { ...rawBack, url: getOptimizedCloudinaryUrl(rawBack.url, { width: 600 }) } : undefined;

  return (
    <div
      className="relative group flex flex-col w-full cursor-pointer bg-white border border-[#F3D6E2] rounded-[20px] overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-1.5 will-change-transform"
      suppressHydrationWarning
    >
      {/* Image Container */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#F5F5F5]">
        {/* Badges */}
        <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-none">
          {product.badge && (
            <span className="bg-[#D62B72] text-white font-bold text-[11px] px-3 py-1 rounded-full shadow-sm">
              {product.badge}
            </span>
          )}
          {hasDiscount && (
            <span className="text-[12px] font-bold bg-[#D62B72] text-white px-2 py-0.5 rounded-full">
                -{discountPercentage}%
              </span>
          )}
          {isOutOfStock && (
            <span className="bg-[#252B3A] text-white font-bold text-[11px] px-3 py-1 rounded-full shadow-sm">
              Sold Out
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistClick}
          className={cn(
            "absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
            wishlisted
              ? "bg-[#D62B72] text-white scale-110"
              : "bg-white/80 backdrop-blur-sm text-[#4B5563] hover:bg-[#D62B72] hover:text-white"
          )}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart size={15} fill={wishlisted ? "currentColor" : "none"} />
        </button>

        {/* Product Images */}
        <Link href={`/products/${product.slug}`} className="block w-full h-full absolute inset-0 z-[1]">
          {frontImg ? (
            <Image
              src={frontImg.url}
              alt={frontImg.alt || product.title}
              fill
              className={cn(
                "object-cover transition-opacity duration-500",
                backImg ? "group-hover:opacity-0 opacity-100" : "opacity-100"
              )}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              fetchPriority={priority ? "high" : "auto"}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-joy-mist">
              <Image src="/placeholder.jpg" alt="Placeholder" fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover opacity-40" />
            </div>
          )}

          {backImg && (
            <Image
              src={backImg.url}
              alt={backImg.alt || product.title}
              fill
              className="object-cover transition-opacity duration-500 opacity-0 group-hover:opacity-100"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}
        </Link>
      </div>

      {/* Product Details & Price */}
      <div className="flex flex-col p-4 sm:p-5 flex-1" suppressHydrationWarning>
        <Link href={`/products/${product.slug}`} className="no-underline mb-1">
          <h3 className="font-body text-[16px] font-bold text-gray-900 leading-tight line-clamp-2">
            {product.title}
          </h3>
        </Link>

        {/* Price Section */}
        <div className="flex items-center gap-2 mt-auto pt-3 flex-wrap">
          <span className="font-body font-extrabold text-[22px] text-[#D62B72]">
            ৳{formatPrice(product.price)}
          </span>
          {hasDiscount && product.compareAtPrice && (
            <>
              <span className="font-body font-medium text-[15px] text-gray-500 line-through">
                ৳{formatPrice(product.compareAtPrice)}
              </span>
              <span className="text-[12px] font-bold bg-[#D62B72] text-white px-2 py-0.5 rounded-full">
                -{discountPercentage}%
              </span>
            </>
          )}
        </div>

        {/* Ratings */}
        <div className="flex items-center gap-1 mt-2 mb-1">
          <div className="flex text-[#F59E0B]">
            {/* We could also make the number of stars dynamic, but typically a 5-star visual works well enough for 4.0+ ratings */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          </div>
          <span className="font-body text-[13px] font-bold text-gray-700 ml-1">{product.rating ?? 4.8}</span>
          <span className="font-body text-[13px] text-gray-500">({product.reviewCount ?? 124})</span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleQuickAdd}
          disabled={isAdding || isOutOfStock}
          className={cn(
            "w-full mt-5 font-body font-bold text-[15px] py-3.5 rounded-full transition-colors flex justify-center items-center shadow-md",
            isOutOfStock 
              ? "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-[#D62B72] hover:bg-[#C51F63] text-white shadow-pink-500/20"
          )}
        >
          {isAdding ? "Adding..." : (isOutOfStock ? "Sold Out" : "Add to Cart")}
        </button>
      </div>
    </div>
  );
}