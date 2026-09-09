import React from "react";
import connectToDatabase from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category"; // Ensure Category schema is registered
import ShopClient from "@/components/product/ShopClient";

// Set ISR Revalidation window to 60 seconds
export const revalidate = 60;

export default async function ShopPage() {
  await connectToDatabase();

  // Pre-fetch top 200 products to allow instant client-side filtering without hitting API routes.
  // Note: For a real 500k catalog, you would want server-side pagination, but preserving the current filtering logic
  // means we pass the list to the client. This is still MUCH better than a client-side fetch on mount.
  const { withCache } = await import('@/lib/cache');
  
  const products = await withCache('products:isr:list', 60, async () => {
    return await Product.find({ isPublished: true })
      .populate('category')
      .select('title price compareAtPrice slug images category badge ageRange createdAt rating reviewCount')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  });

  const serializedProducts = JSON.parse(JSON.stringify(products));

  return (
    <React.Suspense fallback={<div>Loading products...</div>}>
      <ShopClient initialProducts={serializedProducts} />
    </React.Suspense>
  );
}
