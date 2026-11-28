import { NextResponse } from 'next/server';
import { z } from 'zod';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { getSafeErrorMessage } from '@/lib/api-error';
import {
  requireAdminOrManager,
  isValidObjectId,
  PRIVATE_NO_STORE_HEADERS,
} from '@/lib/auth-guards';
import { recalculateProductRating } from '@/lib/review-helpers';

const patchReviewSchema = z
  .object({
    id: z.string().refine(isValidObjectId, 'Invalid review ID'),
    productId: z.string().refine(isValidObjectId, 'Invalid product ID'),
    status: z.enum(['pending', 'published']),
  })
  .strict();

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();

    const [collectionReviews, products] = await Promise.all([
      Review.find()
        .populate('productId', 'title images')
        .sort({ createdAt: -1 })
        .lean() as Promise<
        Array<{
          _id: mongoose.Types.ObjectId;
          productId: { _id: unknown; title: string; images: unknown[] } | null;
          userName: string;
          title?: string;
          rating: number;
          comment: string;
          status?: string;
          createdAt: Date;
          isVerifiedPurchase?: boolean;
        }>
      >,
      Product.find({ 'reviews.0': { $exists: true } })
        .select('title images reviews')
        .lean() as Promise<
        Array<{
          _id: unknown;
          title: string;
          images: unknown[];
          reviews: Array<{
            _id?: mongoose.Types.ObjectId;
            name: string;
            title?: string;
            rating: number;
            text: string;
            status?: string;
            date: Date;
          }>;
        }>
      >,
    ]);

    const allReviews: Array<Record<string, unknown>> = [];

    for (const r of collectionReviews) {
      if (!r.productId) continue;
      allReviews.push({
        _id: r._id.toString(),
        productId: r.productId,
        userName: r.userName,
        title: r.title || '',
        rating: r.rating,
        comment: r.comment,
        status: r.status || 'pending',
        isVerifiedPurchase: Boolean(r.isVerifiedPurchase),
        createdAt: r.createdAt,
        source: 'collection',
      });
    }

    for (const product of products) {
      for (const review of product.reviews || []) {
        allReviews.push({
          _id: review._id ? review._id.toString() : '',
          productId: {
            _id: product._id,
            title: product.title,
            images: product.images,
          },
          userName: review.name,
          title: review.title || '',
          rating: review.rating,
          comment: review.text,
          status: review.status || 'published',
          createdAt: review.date,
          source: 'embedded',
        });
      }
    }

    allReviews.sort(
      (a, b) =>
        new Date(b.createdAt as string | Date).getTime() -
        new Date(a.createdAt as string | Date).getTime()
    );

    return NextResponse.json({ reviews: allReviews }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin GET reviews error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = patchReviewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid data' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { id, productId, status } = parsed.data;

    await connectToDatabase();

    // Update either Review collection document OR legacy embedded Product.reviews entry
    const collectionUpdated = await Review.findOneAndUpdate(
      { _id: id, productId },
      { $set: { status } },
      { returnDocument: 'after' }
    );

    if (!collectionUpdated) {
      const legacyResult = await Product.updateOne(
        { _id: productId, 'reviews._id': id },
        { $set: { 'reviews.$.status': status } }
      );

      if (legacyResult.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Review or Product not found' },
          { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
    }

    await recalculateProductRating(productId);

    return NextResponse.json({ success: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin PATCH review error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');

    if (!isValidObjectId(id) || !isValidObjectId(productId)) {
      return NextResponse.json(
        { error: 'Valid Review ID and Product ID required' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const deletedDoc = await Review.findOneAndDelete({ _id: id, productId });
    if (!deletedDoc) {
      const product = await Product.findByIdAndUpdate(
        productId,
        { $pull: { reviews: { _id: id } } },
        { returnDocument: 'after' }
      );
      if (!product) {
        return NextResponse.json(
          { error: 'Product or review not found' },
          { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
        );
      }
    }

    await recalculateProductRating(productId);

    return NextResponse.json({ success: true }, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Admin DELETE review error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
