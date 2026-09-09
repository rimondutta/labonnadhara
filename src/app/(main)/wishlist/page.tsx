"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWishlist } from "@/components/providers/WishlistProvider";
import ProductGridNike from "@/components/ui/product-grid-nike";
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
    <div className="bg-white min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gray-50 py-12 md:py-16 mb-8 md:mb-12 border-b border-gray-100">
        <div className="max-w-[1440px] mx-auto px-4 md:px-12 text-center">
          <h1 className="font-sans font-medium text-3xl md:text-5xl text-black mb-4">
            My Wishlist
          </h1>
          <p className="text-gray-500 font-sans text-base max-w-2xl mx-auto">
            {count} {count === 1 ? 'item' : 'items'} saved for later
          </p>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-4 md:px-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-8 h-8 text-black animate-spin" />
            <p className="text-gray-500 font-sans">Loading your wishlist...</p>
          </div>
        ) : products.length > 0 ? (
          <div className="animate-in fade-in duration-500">
            <ProductGridNike products={products} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
            </div>
            <h2 className="font-sans font-medium text-2xl text-black mb-3">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 font-sans max-w-md mx-auto mb-8">
              Looks like you haven't added any toys to your wishlist yet. Explore our collection and find something special!
            </p>
            <Link
              href="/products"
              className="inline-flex items-center justify-center bg-black text-white font-sans font-medium px-8 py-3.5 rounded-full hover:bg-neutral-800 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
