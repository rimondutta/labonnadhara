import React from 'react';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import Image from 'next/image';
import Link from 'next/link';

async function getBlogs() {
  try {
    await dbConnect();
    return await BlogPost.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .lean();
  } catch (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }
}

export const metadata = {
  title: "The Blog | Store",
  description: "Read our latest articles.",
};

// Enable ISR to cache the page at the Edge and prevent DB crashes under load
export const revalidate = 60;

const BlogListingPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) => {
  const { category: currentCategory = "All" } = await searchParams;
  const posts: any = await getBlogs();
  
  // Extract unique categories from posts and sort them alphabetically
  const uniqueCategories = Array.from(
    new Set(posts.map((p: any) => p.category).filter(Boolean))
  ).sort() as string[];
  
  const displayCategories = ["All", ...uniqueCategories];

  // Filter posts based on selected category
  const filteredPosts = currentCategory === "All" 
    ? posts 
    : posts.filter((p: any) => p.category === currentCategory);

  return (
    <div className="w-full flex-1 bg-[#FAFAFA] min-h-screen pt-20">
      
      {/* ── Header Container ── */}
      <div className="flex flex-col items-center text-center justify-center pt-16 pb-20 px-4">
        <h1 className="font-serif font-light text-[50px] md:text-[80px] text-black tracking-tight leading-none mb-6">
          The Editorial
        </h1>
        <p className="font-body text-zinc-500 max-w-md text-sm leading-relaxed mb-10">
          Stories, guides, and inspiration for curious kids and the parents who love them.
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {displayCategories.map((cat, idx) => {
            const isActive = currentCategory === cat;
            return (
              <Link
                href={cat === "All" ? "/blogs" : `/blogs?category=${encodeURIComponent(cat)}`}
                key={cat}
                className={`font-mono text-[10px] uppercase tracking-[0.2em] font-bold cursor-pointer transition-colors ${
                  isActive ? "text-black border-b border-black pb-1" : "text-zinc-400 hover:text-black border-b border-transparent pb-1"
                }`}
              >
                {cat}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Blog Post Grid ── */}
      <div className="px-4 sm:px-8 lg:px-[5vw] max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 gap-y-16 pb-32">
        {filteredPosts.map((post: any) => (
          <div key={post._id.toString()} className="group cursor-pointer flex flex-col gap-6">
            {/* Thumbnail */}
            <div className="w-full aspect-[3/4] relative overflow-hidden bg-zinc-200">
              <Link href={`/blogs/${post.slug}`} className="block w-full h-full">
                {post.featuredImage?.url && (
                  <Image
                    src={post.featuredImage.url}
                    alt={post.featuredImage.alt || post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                )}
              </Link>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400">
                <span>{post.category || "Editorial"}</span>
                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                <span>
                  {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              
              <Link href={`/blogs/${post.slug}`}>
                <h2 className="font-serif text-2xl md:text-3xl text-black leading-snug group-hover:text-[#D5AEFD] transition-colors line-clamp-2">
                  {post.title}
                </h2>
              </Link>
              
              <p className="font-body text-sm font-light text-zinc-600 line-clamp-2 leading-relaxed">
                {post.excerpt}
              </p>
              
              <Link 
                href={`/blogs/${post.slug}`}
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-black mt-2 hover:text-zinc-500 transition-colors w-max border-b border-black/20 hover:border-zinc-500 pb-1"
              >
                Read Story
              </Link>
            </div>
          </div>
        ))}

        {filteredPosts.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-400 font-body text-sm">
            <p>No stories found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListingPage;
