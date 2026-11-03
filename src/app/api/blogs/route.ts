import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';

export async function GET() {
  try {
    await dbConnect();
    
    const posts = await BlogPost.find({ isPublished: true })
      .sort({ publishedAt: -1 })
      .lean();

    return NextResponse.json(posts, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=600',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. Defense-in-depth Authentication & Authorization
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or manager access required' }, { status: 403 });
    }

    await dbConnect();
    
    const data = await req.json();
    
    if (!data.title || typeof data.title !== 'string' || !data.content || typeof data.content !== 'string' || !data.featuredImage?.url) {
      return NextResponse.json(
        { error: 'Missing required fields (title, content, featuredImage.url)' },
        { status: 400 }
      );
    }
    
    // Auto-generate excerpt if missing or empty
    const excerpt = (typeof data.excerpt === 'string' && data.excerpt.trim())
      ? data.excerpt.trim()
      : data.content.substring(0, 150) + '...';
    
    // Create slug from title if not provided
    const baseSlug = (typeof data.slug === 'string' && data.slug.trim())
      ? data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Ensure unique slug
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await BlogPost.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 2. Strict Whitelisting - Prevent Mass Assignment
    const whitelistedData = {
      title: data.title.trim(),
      slug: uniqueSlug,
      content: data.content,
      excerpt,
      featuredImage: {
        url: String(data.featuredImage.url).trim(),
        alt: data.featuredImage.alt ? String(data.featuredImage.alt).trim() : undefined,
      },
      category: typeof data.category === 'string' && data.category.trim() ? data.category.trim() : 'Editorial',
      tags: Array.isArray(data.tags) ? data.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.trim()) : [],
      readingTime: typeof data.readingTime === 'string' ? data.readingTime.trim() : undefined,
      isPublished: typeof data.isPublished === 'boolean' ? data.isPublished : true,
      publishedAt: data.isPublished === false ? undefined : new Date(),
      author: data.author && typeof data.author === 'object' ? {
        name: typeof data.author.name === 'string' ? data.author.name.trim() : (session.user as { name?: string }).name || 'Editorial',
        avatar: typeof data.author.avatar === 'string' ? data.author.avatar.trim() : undefined,
      } : {
        name: (session.user as { name?: string }).name || 'Editorial',
      },
    };

    const newPost = await BlogPost.create(whitelistedData);

    return NextResponse.json(newPost, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
