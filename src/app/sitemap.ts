import type { MetadataRoute } from 'next';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import BlogPost from '@/models/BlogPost';
import Category from '@/models/Category';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Use a more robust way to get the base URL
  let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://toyhourse.com';
  
  // Remove trailing slash if present to avoid double slashes in paths
  baseUrl = baseUrl.replace(/\/$/, '');

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
  ];

  try {
    await connectToDatabase();

    // Fetch all published products
    const products = await Product.find({ isPublished: true })
      .select('slug updatedAt')
      .lean();

    // Fetch all published blog posts
    const blogs = await BlogPost.find({ isPublished: true })
      .select('slug updatedAt')
      .lean();

    // Fetch active categories
    const categories = await Category.find({ isActive: true })
      .select('slug updatedAt')
      .lean();

    // Dynamic product pages
    const productPages: MetadataRoute.Sitemap = products.map((product: any) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Dynamic blog pages
    const blogPages: MetadataRoute.Sitemap = blogs.map((blog: any) => ({
      url: `${baseUrl}/blogs/${blog.slug}`,
      lastModified: blog.updatedAt || new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // Category filter pages - ensuring canonical-style URLs
    const categoryPages: MetadataRoute.Sitemap = categories.map((cat: any) => ({
      url: `${baseUrl}/products?category=${cat.slug}`,
      lastModified: cat.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...productPages, ...blogPages, ...categoryPages];
  } catch (error) {
    console.error("Failed to connect to database for sitemap generation:", error);
    return staticPages;
  }
}
