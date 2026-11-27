import React from "react";
import connectToDatabase from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category"; // Ensure Category schema is registered
import ShopClient from "@/components/product/ShopClient";

// Set ISR Revalidation window to 60 seconds
export const revalidate = 60;

export default async function ShopPage() {
  const { getOrSetCached } = await import('@/lib/cache/redis-cache');

  // Cache-first: only connect to MongoDB on a cache miss.
  const products = await getOrSetCached('products:isr:list:48', 300, async () => {
    if (!process.env.MONGODB_URI) return [];
    await connectToDatabase();
    return await Product.find({ isPublished: true })
      .populate('category', 'name slug')
      .select('title price compareAtPrice slug images category badge ageRange createdAt rating reviewCount inventory hasVariations variants')
      .sort({ createdAt: -1 })
      .limit(48)
      .lean();
  });

  const serializedProducts = JSON.parse(JSON.stringify(products));

  return (
    <React.Suspense fallback={
      <div className="w-full min-h-screen bg-white pt-28 px-4 sm:px-8 lg:px-[5vw]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8 max-w-7xl mx-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#FFF8FB] rounded-[20px] animate-pulse overflow-hidden border border-[#F3D6E2]">
              <div className="aspect-[4/5] bg-pink-100/60" />
              <div className="p-4 flex flex-col gap-3">
                <div className="h-4 bg-pink-100 rounded w-3/4" />
                <div className="h-6 bg-pink-200/50 rounded w-1/2" />
                <div className="h-10 bg-[#D62B72]/20 rounded-full mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <ShopClient initialProducts={serializedProducts} />
    </React.Suspense>
  );
}
