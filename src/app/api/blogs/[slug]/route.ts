import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import mongoose from 'mongoose';

// GET — fetch single blog post by slug (public storefront)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    const post = await BlogPost.findOne({
      slug: slug,
      isPublished: true,
    }).lean();

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(post);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}

// PATCH — update blog post by ID (Admin/Manager only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Authentication & Authorization
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or manager access required' }, { status: 403 });
    }

    await dbConnect();
    const { slug: id } = await params;

    // 2. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid blog post ID format' }, { status: 400 });
    }

    const body = await req.json();

    // 3. Strict Field Whitelisting (No Mass Assignment)
    const updateData: Record<string, unknown> = {};

    if (typeof body.isPublished === 'boolean') {
      updateData.isPublished = body.isPublished;
      if (body.isPublished) {
        updateData.publishedAt = new Date();
      }
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      updateData.title = body.title.trim();
    }
    if (typeof body.content === 'string' && body.content.trim()) {
      updateData.content = body.content;
    }
    if (typeof body.excerpt === 'string') {
      updateData.excerpt = body.excerpt.trim();
    }
    if (body.featuredImage && typeof body.featuredImage.url === 'string') {
      updateData.featuredImage = {
        url: body.featuredImage.url.trim(),
        alt: body.featuredImage.alt ? String(body.featuredImage.alt).trim() : undefined,
      };
    }
    if (typeof body.category === 'string') {
      updateData.category = body.category.trim();
    }
    if (Array.isArray(body.tags)) {
      updateData.tags = body.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.trim());
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE — permanently delete a blog post by ID (Admin/Manager only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Authentication & Authorization
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or manager access required' }, { status: 403 });
    }

    await dbConnect();
    const { slug: id } = await params;

    // 2. Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid blog post ID format' }, { status: 400 });
    }

    const post = await BlogPost.findByIdAndDelete(id);

    if (!post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Blog post deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
