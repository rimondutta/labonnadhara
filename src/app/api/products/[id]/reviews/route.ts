import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Review from '@/models/Review';
import Order from '@/models/Order';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import { mobileCorsHeaders } from '@/lib/cors';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { redis, hasRedis } from '@/lib/redis';
import { isValidObjectId } from '@/lib/auth-guards';
import { hasUnsafeObjectKeys, productReviewInputSchema } from '@/lib/validation/schemas';
import { isAllowedMutationOrigin } from '@/lib/upload-security';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(req) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many review submissions. Please try again later.' },
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    if (!isAllowedMutationOrigin(req)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid request origin' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400, headers: CORS_HEADERS });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400, headers: CORS_HEADERS });
    }

    const candidate = {
      rating: typeof (rawBody as Record<string, unknown>).rating === 'string'
        ? Number((rawBody as Record<string, unknown>).rating)
        : (rawBody as Record<string, unknown>).rating,
      title: (rawBody as Record<string, unknown>).title,
      text: (rawBody as Record<string, unknown>).text,
      name: (rawBody as Record<string, unknown>).name,
    };

    const parsed = productReviewInputSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid review submission' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Per-IP per-product submission cooldown (prevents spam flooding onto a single product)
    const cooldownKey = `review:cooldown:${id}:${ip}`;
    if (hasRedis && redis) {
      try {
        const acquired = await redis.set(cooldownKey, '1', { ex: 600, nx: true });
        if (!acquired) {
          return NextResponse.json(
            { error: 'You have recently submitted a review for this product. Please try again later.' },
            { status: 429, headers: CORS_HEADERS }
          );
        }
      } catch (redisErr) {
        console.warn('[Reviews] Cooldown check failed; continuing:', getSafeErrorMessage(redisErr));
      }
    }

    await connectToDatabase();

    const product = await Product.findById(id).select('_id slug isPublished').lean() as {
      _id: unknown;
      slug?: string;
      isPublished?: boolean;
    } | null;

    if (!product || product.isPublished === false) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: CORS_HEADERS });
    }

    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const userEmail = (session?.user as { email?: string } | undefined)?.email?.toLowerCase();

    if (userId) {
      const existingReview = await Review.findOne({ productId: product._id, userId }).select('_id').lean();
      if (existingReview) {
        return NextResponse.json(
          { error: 'You have already reviewed this product' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
    }

    let isVerifiedPurchase = false;
    if (userEmail || userId) {
      const orderQuery: Record<string, unknown> = {
        'items.productId': product._id,
        fulfillmentStatus: { $ne: 'cancelled' },
      };
      if (userEmail) {
        orderQuery.customerEmail = userEmail;
      }
      isVerifiedPurchase = Boolean(await Order.exists(orderQuery));
    }

    const review = await Review.create({
      productId: product._id,
      userId,
      userName: parsed.data.name,
      title: parsed.data.title,
      rating: parsed.data.rating,
      comment: parsed.data.text,
      isVerifiedPurchase,
      status: 'pending',
    });

    revalidatePath('/');
    revalidatePath('/products');
    if (product.slug) {
      revalidatePath(`/products/${product.slug}`);
    }

    // Never return the full Product document — return only safe review summary fields
    return NextResponse.json(
      {
        success: true,
        review: {
          id: review._id.toString(),
          rating: review.rating,
          title: review.title,
          text: review.comment,
          name: review.userName,
          status: review.status,
          isVerifiedPurchase: review.isVerifiedPurchase,
          createdAt: review.createdAt,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Error submitting review:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
