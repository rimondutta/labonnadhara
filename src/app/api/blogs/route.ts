import { NextResponse } from 'next/server';
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
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    
    // NOTE: Ideally add session check here for admin/manager role
    const data = await req.json();
    
    if (!data.title || !data.content || !data.featuredImage?.url) {
      return NextResponse.json(
        { error: 'Missing required fields (title, content, featuredImage)' },
        { status: 400 }
      );
    }
    
    // Auto-generate excerpt if missing or empty
    if (!data.excerpt || data.excerpt.trim() === '') {
      data.excerpt = data.content.substring(0, 150) + '...';
    }
    
    // Create slug from title if not provided
    if (!data.slug) {
      data.slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    // Ensure unique slug
    let uniqueSlug = data.slug;
    let counter = 1;
    while (await BlogPost.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${data.slug}-${counter}`;
      counter++;
    }
    data.slug = uniqueSlug;

    const newPost = await BlogPost.create(data);

    return NextResponse.json(newPost, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create blog post:", error);
    return NextResponse.json(
      { error: error.message || 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
