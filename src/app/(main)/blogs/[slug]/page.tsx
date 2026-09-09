import React from 'react';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import Product from '@/models/Product';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FaFacebookF, FaPinterest } from "react-icons/fa";
import { FaXTwitter, FaPlus } from "react-icons/fa6";
import { GoChevronLeft, GoChevronRight } from "react-icons/go";

async function getBlogPost(slug: string) {
  try {
    await dbConnect();
    return await BlogPost.findOne({ slug, isPublished: true }).lean();
  } catch (error) {
    console.error("Failed to fetch blog post:", error);
    return null;
  }
}

export const revalidate = 60;
export const dynamicParams = true;
const SingleBlogPage = async ({
  params
}: {
  params: Promise<{ slug: string }>
}) => {
  const { slug } = await params;
  const post: any = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="w-full flex-1 bg-[#FAFAFA] min-h-screen pb-32 pt-20">
      
      {/* ── Header Container ── */}
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-16 pb-12 flex flex-col items-center text-center">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 mb-8">
          <span>{post.category || "Editorial"}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          <span>
            {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          <span>BY {post.author?.name || "admin"}</span>
        </div>
        
        <h1 className="font-serif font-light text-[45px] md:text-[70px] text-black tracking-tight leading-tight mb-8">
          {post.title}
        </h1>
      </div>

      {/* ── Featured Image ── */}
      {post.featuredImage?.url && (
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-8 mb-20">
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-zinc-200">
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* ── Content Body ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-8">
        <div className="prose prose-lg md:prose-xl max-w-none prose-p:font-body prose-p:font-light prose-p:text-zinc-700 prose-p:leading-relaxed prose-headings:font-serif prose-headings:font-light prose-headings:text-black prose-a:text-[#043224] prose-a:underline prose-li:font-body prose-li:font-light prose-li:text-zinc-700">
          {post.content.split('\n\n').map((paragraph: string, i: number) => {
            if (paragraph.startsWith('# ')) {
              return <h2 key={i} className="text-4xl mt-16 mb-8 tracking-tight">{paragraph.replace('# ', '')}</h2>;
            }
            if (paragraph.startsWith('## ')) {
              return <h3 key={i} className="text-3xl mt-12 mb-6 tracking-tight">{paragraph.replace('## ', '')}</h3>;
            }
            if (paragraph.startsWith('- ')) {
               return <li key={i} className="ml-6 list-disc mb-3">{paragraph.replace('- ', '')}</li>;
            }
            return <p key={i} className="mb-8">{paragraph}</p>;
          })}
        </div>

        {/* ── Tags ── */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-16 pt-12 border-t border-black/10">
            {post.tags.map((tag: string) => (
              <span key={tag} className="font-mono text-[10px] uppercase tracking-[0.1em] font-bold text-zinc-500 bg-zinc-100 px-4 py-2">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mt-24 pt-12 border-t border-black/10">
          <Link href="/blogs" className="group flex flex-col items-center sm:items-start gap-3 cursor-pointer">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 group-hover:text-black transition-colors">
              <GoChevronLeft size={16} />
              <span>Back to Editorial</span>
            </div>
          </Link>
          
          <Link href="/blogs" className="group flex flex-col items-center sm:items-end gap-3 cursor-pointer">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 group-hover:text-black transition-colors">
              <span>Next Article</span>
              <GoChevronRight size={16} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SingleBlogPage;
