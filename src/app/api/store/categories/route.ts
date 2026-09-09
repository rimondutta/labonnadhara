import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Category from "@/models/Category";

export async function GET() {
  try {
    await connectToDatabase();
    
    const { withCache } = await import('@/lib/cache');
    const categories = await withCache('categories:legacy:list', 3600, async () => {
      return await Category.find({ isActive: true }).select("name slug image description").lean();
    });

    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
