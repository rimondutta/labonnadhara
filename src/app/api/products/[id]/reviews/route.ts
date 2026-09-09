import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { revalidatePath } from 'next/cache';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { rating, title, text, name } = body;

    // Basic validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Valid rating between 1 and 5 is required' }, { status: 400 });
    }
    if (!title || !text || !name) {
      return NextResponse.json({ error: 'Title, review text, and name are required' }, { status: 400 });
    }

    await connectToDatabase();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Add the new review
    const newReview = {
      rating: Number(rating),
      title: title.trim(),
      text: text.trim(),
      name: name.trim(),
      date: new Date(),
      status: 'pending'
    };

    product.reviews.push(newReview);

    // Recalculate average rating
    const totalRating = product.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
    product.rating = Number((totalRating / product.reviews.length).toFixed(1));
    product.reviewCount = product.reviews.length;

    await product.save();

    // Clear cache so the storefront updates instantly
    revalidatePath('/');
    revalidatePath('/products');
    if (product.slug) {
      revalidatePath(`/products/${product.slug}`);
    }

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
