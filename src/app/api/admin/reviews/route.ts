import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import { getSafeErrorMessage } from '@/lib/api-error';

/** Recalculates rating/reviewCount from published reviews only and saves the product. */
async function recalcProductRating(productId: string | mongoose.Types.ObjectId) {
  const product = await Product.findById(productId).select('reviews rating reviewCount');
  if (!product) return;
  const published = (product.reviews as { status: string; rating: number }[]).filter(
    (r) => r.status === 'published'
  );
  product.rating = published.length > 0
    ? Number((published.reduce((s, r) => s + r.rating, 0) / published.length).toFixed(1))
    : 0;
  product.reviewCount = published.length;
  await product.save();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch all products that have reviews
    const products = await Product.find({ 'reviews.0': { $exists: true } })
      .select('title images reviews')
      .lean();

    // Flatten reviews and add product context
    const allReviews: Record<string, unknown>[] = [];
    (products as { _id: unknown; title: string; images: unknown[]; reviews: { _id?: string; name: string; rating: number; text: string; status?: string; date: Date }[] }[]).forEach((product) => {
      product.reviews.forEach((review) => {
        allReviews.push({
          _id: review._id || new mongoose.Types.ObjectId().toString(),
          productId: {
            _id: product._id,
            title: product.title,
            images: product.images,
          },
          userName: review.name,
          rating: review.rating,
          comment: review.text,
          status: review.status || 'published', // legacy reviews are considered published
          createdAt: review.date,
        });
      });
    });

    // Sort by newest first
    allReviews.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());

    return NextResponse.json({ reviews: allReviews });
  } catch (error: unknown) {
    console.error('Admin GET reviews error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, productId, status } = body;

    if (!id || !productId || !status || !['pending', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await connectToDatabase();

    // Update the specific review's status inside the product's reviews array
    const result = await Product.updateOne(
      { _id: productId, 'reviews._id': id },
      { $set: { 'reviews.$.status': status } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Review or Product not found' }, { status: 404 });
    }

    // Recalculate rating using published reviews only, now that the status has changed
    await recalcProductRating(productId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Admin PATCH review error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');

    if (!id || !productId) {
      return NextResponse.json({ error: 'Review ID and Product ID are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Remove the review from the array and return the updated document
    const product = await Product.findByIdAndUpdate(
      productId,
      { $pull: { reviews: { _id: id } } },
      { returnDocument: 'after' }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Recalculate average rating using only published reviews after deletion
    const publishedReviews = (product.reviews as { status: string; rating: number }[]).filter(
      (r) => r.status === 'published'
    );
    product.rating = publishedReviews.length > 0
      ? Number((publishedReviews.reduce((s, r) => s + r.rating, 0) / publishedReviews.length).toFixed(1))
      : 0;
    product.reviewCount = publishedReviews.length;
    await product.save();

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Admin DELETE review error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
