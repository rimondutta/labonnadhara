import React from "react";
import connectToDatabase from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category"; // Ensure Category schema is registered
import ShopClient from "@/components/product/ShopClient";

// Set ISR Revalidation window to 60 seconds
export const revalidate = 60;

export default async function ShopPage() {
  await connectToDatabase();

  // Pre-fetch top 48 products to allow instant client-side filtering without hitting API routes.
  // Capped at 48 to keep the initial page payload lean and reduce Time-to-Interactive.
  const { withCache } = await import('@/lib/cache');
  
  const products = await withCache('products:isr:list:48', 60, async () => {
    return await Product.find({ isPublished: true })
      .populate('category')
      .select('title price compareAtPrice slug images category badge ageRange createdAt rating reviewCount inventory hasVariations variants')
      .sort({ createdAt: -1 })
      .limit(48)
      .lean();
  });

  const serializedProducts = JSON.parse(JSON.stringify(products));

  return (
    <React.Suspense fallback={<div>Loading products...</div>}>
      <ShopClient initialProducts={serializedProducts} />
    </React.Suspense>
  );
}
