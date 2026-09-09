import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch all products that have reviews
    const products = await Product.find({ 'reviews.0': { $exists: true } })
      .select('title images reviews')
      .lean();

    // Flatten reviews and add product context
    const allReviews: any[] = [];
    products.forEach((product: any) => {
      product.reviews.forEach((review: any) => {
        allReviews.push({
          _id: review._id || review.id || new mongoose.Types.ObjectId().toString(),
          productId: {
            _id: product._id,
            title: product.title,
            images: product.images
          },
          userName: review.name,
          rating: review.rating,
          comment: review.text,
          status: review.status || 'published', // legacy reviews are considered published
          createdAt: review.date
        });
      });
    });

    // Sort by newest first
    allReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ reviews: allReviews });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, productId, status } = body;

    if (!id || !productId || !status || !['pending', 'published'].includes(status)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Update the specific review inside the product's reviews array
    const result = await Product.updateOne(
      { _id: productId, 'reviews._id': id },
      { $set: { 'reviews.$.status': status } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Review or Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const productId = searchParams.get('productId');

    if (!id || !productId) {
      return NextResponse.json({ error: 'Review ID and Product ID are required' }, { status: 400 });
    }

    await connectToDatabase();
    
    // Remove the review from the array
    const product = await Product.findByIdAndUpdate(
      productId,
      { $pull: { reviews: { _id: id } } },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Recalculate average rating
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
      product.rating = Number((totalRating / product.reviews.length).toFixed(1));
    } else {
      product.rating = 0;
    }
    product.reviewCount = product.reviews.length;
    await product.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
