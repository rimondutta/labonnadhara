import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Review from '@/models/Review';
import Order from '@/models/Order';
import { requireAuthenticatedUser } from '@/lib/auth-guards';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { hasUnsafeObjectKeys, storeReviewInputSchema } from '@/lib/validation/schemas';
import { getSafeErrorMessage } from '@/lib/api-error';

// GET: Fetch published reviews for a product
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const product = isMongoId
      ? await Product.findById(slug).select('_id').lean()
      : await Product.findOne({ slug }).select('_id').lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviews = await Review.find({
      productId: (product as { _id: unknown })._id,
      $or: [{ status: 'published' }, { status: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('userName title rating comment isVerifiedPurchase createdAt')
      .lean();

    return NextResponse.json(
      { reviews },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (error: unknown) {
    console.error('[Store Reviews GET]:', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

// POST: Submit a new review (authenticated user + Zod validated + moderated)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(req);
    const rateLimit = await checkRateLimit(ip, 'strict');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        { error: 'Too many review submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const auth = await requireAuthenticatedUser(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { slug } = await params;
    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody) || hasUnsafeObjectKeys(rawBody)) {
      return NextResponse.json({ error: 'Invalid review payload' }, { status: 400 });
    }

    const candidate = {
      rating: typeof (rawBody as Record<string, unknown>).rating === 'string'
        ? Number((rawBody as Record<string, unknown>).rating)
        : (rawBody as Record<string, unknown>).rating,
      comment: (rawBody as Record<string, unknown>).comment,
      title: (rawBody as Record<string, unknown>).title,
    };

    const parsed = storeReviewInputSchema.safeParse(candidate);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Rating and comment are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const product = isMongoId
      ? await Product.findById(slug).select('_id').lean()
      : await Product.findOne({ slug }).select('_id').lean();

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const productId = (product as { _id: unknown })._id;

    const existingReview = await Review.findOne({
      productId,
      userId: auth.session.user.id,
    })
      .select('_id')
      .lean();

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 });
    }

    const isVerifiedPurchase = auth.session.user.email
      ? Boolean(
          await Order.exists({
            customerEmail: auth.session.user.email.toLowerCase(),
            'items.productId': productId,
            fulfillmentStatus: { $ne: 'cancelled' },
          })
        )
      : false;

    const review = await Review.create({
      productId,
      userId: auth.session.user.id,
      userName: auth.session.user.name || 'Customer',
      title: parsed.data.title || '',
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      isVerifiedPurchase,
      status: 'pending',
    });

    return NextResponse.json(
      {
        review: {
          _id: review._id.toString(),
          userName: review.userName,
          title: review.title,
          rating: review.rating,
          comment: review.comment,
          status: review.status,
          isVerifiedPurchase: review.isVerifiedPurchase,
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[Store Reviews POST]:', getSafeErrorMessage(error));
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
