import Homepage from "@/components/sections/Homepage";
import connectToDatabase from "@/lib/db";
import Product from "@/models/Product";
import Category from "@/models/Category";
import BlogPost from "@/models/BlogPost";
import { getOrSetCached } from "@/lib/cache/redis-cache";

// Enable ISR caching at Vercel Edge / CDN
export const revalidate = 60;

const HOMEPAGE_CACHE_KEY = 'cache:home:data';
const HOMEPAGE_TTL = 300; // 5 min in Redis

async function fetchHomepageData() {
  const startTotal = performance.now();

  const data = await getOrSetCached(
    HOMEPAGE_CACHE_KEY,
    HOMEPAGE_TTL,
    async () => {
      if (!process.env.MONGODB_URI) {
        return { trendingProducts: [], categories: [], latestBlogs: [] };
      }
      const dbStart = performance.now();
      await connectToDatabase();
      const dbConnectDuration = (performance.now() - dbStart).toFixed(2);

      const queryStart = performance.now();
      // Execute all 3 queries in parallel with lean() and targeted select()
      const [dbProducts, dbCategories, dbBlogs] = await Promise.all([
        Product.find({ isPublished: true })
          .select('title price compareAtPrice slug images badge inventory rating reviewCount')
          .sort({ createdAt: -1 })
          .limit(4)
          .lean(),
        Category.find({ isActive: true })
          .select('name slug image')
          .limit(10)
          .lean(),
        BlogPost.find({ isPublished: true })
          .select('title slug excerpt featuredImage category publishedAt createdAt')
          .sort({ publishedAt: -1 })
          .limit(3)
          .lean(),
      ]);
      const queryDuration = (performance.now() - queryStart).toFixed(2);

      console.log(`[PERF][Homepage-DB-Miss] DB Connect: ${dbConnectDuration}ms | Queries: ${queryDuration}ms`);

      return {
        trendingProducts: JSON.parse(JSON.stringify(dbProducts)),
        categories: JSON.parse(JSON.stringify(dbCategories)),
        latestBlogs: JSON.parse(JSON.stringify(dbBlogs)),
      };
    }
  );

  const totalDuration = (performance.now() - startTotal).toFixed(2);
  console.log(`[PERF][Homepage-Total] Data Fetch: ${totalDuration}ms`);

  return data;
}

export default async function Home() {
  const { trendingProducts, categories, latestBlogs } = await fetchHomepageData();

  return (
    <Homepage
      initialTrendingProducts={trendingProducts}
      initialCategories={categories}
      initialBlogs={latestBlogs}
    />
  );
}
