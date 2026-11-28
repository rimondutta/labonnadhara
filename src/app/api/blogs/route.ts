import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { hasUnsafeObjectKeys, isSafeImageUrl } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

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
    console.error('[GET /api/blogs]', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const data = await req.json().catch(() => null);
    if (!data || typeof data !== 'object' || Array.isArray(data) || hasUnsafeObjectKeys(data)) {
      return NextResponse.json(
        { error: 'Invalid blog post payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    if (
      !data.title ||
      typeof data.title !== 'string' ||
      !data.content ||
      typeof data.content !== 'string' ||
      typeof data.featuredImage?.url !== 'string' ||
      !isSafeImageUrl(data.featuredImage.url.trim())
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields (title, content, valid featuredImage.url)' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await dbConnect();

    const excerpt =
      typeof data.excerpt === 'string' && data.excerpt.trim()
        ? data.excerpt.trim()
        : data.content.substring(0, 150) + '...';

    const baseSlug =
      typeof data.slug === 'string' && data.slug.trim()
        ? data.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        : data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    let uniqueSlug = baseSlug || `post-${Date.now()}`;
    let counter = 1;
    while (await BlogPost.findOne({ slug: uniqueSlug }).select('_id').lean()) {
      uniqueSlug = `${baseSlug || 'post'}-${counter}`;
      counter++;
    }

    const authorAvatar =
      data.author &&
      typeof data.author === 'object' &&
      typeof data.author.avatar === 'string' &&
      isSafeImageUrl(data.author.avatar.trim())
        ? data.author.avatar.trim()
        : undefined;

    const whitelistedData = {
      title: data.title.trim().slice(0, 200),
      slug: uniqueSlug,
      content: data.content,
      excerpt: excerpt.slice(0, 500),
      featuredImage: {
        url: data.featuredImage.url.trim(),
        alt: data.featuredImage.alt ? String(data.featuredImage.alt).trim().slice(0, 200) : undefined,
      },
      category:
        typeof data.category === 'string' && data.category.trim()
          ? data.category.trim().slice(0, 80)
          : 'Editorial',
      tags: Array.isArray(data.tags)
        ? data.tags
            .filter((t: unknown): t is string => typeof t === 'string')
            .map((t: string) => t.trim().slice(0, 50))
            .slice(0, 20)
        : [],
      readingTime:
        typeof data.readingTime === 'string' ? data.readingTime.trim().slice(0, 40) : undefined,
      isPublished: typeof data.isPublished === 'boolean' ? data.isPublished : true,
      publishedAt: data.isPublished === false ? undefined : new Date(),
      author:
        data.author && typeof data.author === 'object'
          ? {
              name:
                typeof data.author.name === 'string' && data.author.name.trim()
                  ? data.author.name.trim().slice(0, 100)
                  : auth.session.user.name || 'Editorial',
              avatar: authorAvatar,
            }
          : {
              name: auth.session.user.name || 'Editorial',
            },
    };

    const newPost = await BlogPost.create(whitelistedData);

    return NextResponse.json(newPost, { status: 201, headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[POST /api/blogs]', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
