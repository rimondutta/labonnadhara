import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import {
  requireAdminOrManager,
  isValidObjectId,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { hasUnsafeObjectKeys, isSafeImageUrl } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

// GET — fetch single blog post by slug (public storefront)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    const post = await BlogPost.findOne({
      slug: String(slug).trim(),
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
    console.error('[GET /api/blogs/[slug]]', getSafeErrorMessage(error));
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
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { slug: id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid blog post ID format' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body) || hasUnsafeObjectKeys(body)) {
      return NextResponse.json(
        { error: 'Invalid blog update payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await dbConnect();

    const updateData: Record<string, unknown> = {};

    if (typeof body.isPublished === 'boolean') {
      updateData.isPublished = body.isPublished;
      if (body.isPublished) {
        updateData.publishedAt = new Date();
      }
    }
    if (typeof body.title === 'string' && body.title.trim()) {
      updateData.title = body.title.trim().slice(0, 200);
    }
    if (typeof body.content === 'string' && body.content.trim()) {
      updateData.content = body.content;
    }
    if (typeof body.excerpt === 'string') {
      updateData.excerpt = body.excerpt.trim().slice(0, 500);
    }
    if (body.featuredImage && typeof body.featuredImage.url === 'string') {
      const imgUrl = body.featuredImage.url.trim();
      if (!isSafeImageUrl(imgUrl)) {
        return NextResponse.json(
          { error: 'Invalid featured image URL' },
          { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
      updateData.featuredImage = {
        url: imgUrl,
        alt: body.featuredImage.alt ? String(body.featuredImage.alt).trim().slice(0, 200) : undefined,
      };
    }
    if (typeof body.category === 'string') {
      updateData.category = body.category.trim().slice(0, 80);
    }
    if (Array.isArray(body.tags)) {
      updateData.tags = body.tags
        .filter((t: unknown): t is string => typeof t === 'string')
        .map((t: string) => t.trim().slice(0, 50))
        .slice(0, 20);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const post = await BlogPost.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(post, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[PATCH /api/blogs/[slug]]', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

// DELETE — permanently delete a blog post by ID (Admin/Manager only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { slug: id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid blog post ID format' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await dbConnect();

    const post = await BlogPost.findByIdAndDelete(id);

    if (!post) {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Blog post deleted successfully' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[DELETE /api/blogs/[slug]]', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
