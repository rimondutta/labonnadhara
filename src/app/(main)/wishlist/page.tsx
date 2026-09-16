"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/WishlistProvider";
import ProductGridRimon from "@/components/ui/product-grid-rimon";
import { Loader2, Heart } from "lucide-react";

export default function WishlistPage() {
  const { items, count } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`/api/store/products?ids=${items.join(",")}&limit=50`);
        const data = await res.json();
        
        if (data.products) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error("Error fetching wishlist products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [items]); // Re-fetch if items change (e.g. they remove one)

  return (
    <div className="bg-[#FFF1F6] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-[#FFF8FB] pt-24 md:pt-32 py-12 md:py-16 mb-8 md:mb-12 border-b border-[#F3D6E2]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 text-center">
          <h1 className="font-serif font-bold text-3xl md:text-5xl text-[#252B3A] mb-4 tracking-tight">
            My Wishlist
          </h1>
          <p className="text-[#4B5563] font-sans text-base max-w-2xl mx-auto">
            {count} {count === 1 ? 'item' : 'items'} saved for later
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-8 h-8 text-[#D62B72] animate-spin" />
            <p className="text-[#4B5563] font-sans">Loading your wishlist...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="animate-in fade-in duration-500">
            <ProductGridRimon products={products} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 bg-[#FFF8FB] rounded-full flex items-center justify-center mb-6 ring-4 ring-white">
              <Heart className="w-10 h-10 text-[#D62B72]" strokeWidth={1.5} />
            </div>
            <h2 className="font-serif font-bold text-2xl text-[#252B3A] mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-[#4B5563] font-sans max-w-md mx-auto mb-8">
              Looks like you haven't added any jewelry to your wishlist yet. Explore our collection and find something special!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-[#de2b6a] text-white font-sans font-medium px-8 py-3.5 rounded-full hover:bg-[#c4205a] transition-all duration-300 shadow-[0_8px_20px_rgba(222,43,106,0.3)] hover:shadow-[0_12px_25px_rgba(222,43,106,0.4)] hover:-translate-y-1"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
