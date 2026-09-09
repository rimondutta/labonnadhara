import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import Review from '@/models/Review';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';

// GET: Fetch reviews for a product
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    await connectToDatabase();

    // Find product ID first
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const product = isMongoId 
      ? await Product.findById(slug) 
      : await Product.findOne({ slug });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviews = await Review.find({ 
      productId: product._id,
      $or: [{ status: 'published' }, { status: { $exists: false } }]
    })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ reviews });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Submit a new review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { slug } = await params;
    const { rating, comment } = await req.json();

    if (!rating || !comment) {
      return NextResponse.json({ error: 'Rating and comment are required' }, { status: 400 });
    }

    await connectToDatabase();

    // Find product
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const product = isMongoId 
      ? await Product.findById(slug) 
      : await Product.findOne({ slug });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({ 
      productId: product._id, 
      userId: (session.user as any).id 
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You have already reviewed this product' }, { status: 400 });
    }

    const review = await Review.create({
      productId: product._id,
      userId: (session.user as any).id,
      userName: session.user.name || 'Anonymous',
      rating,
      comment,
      isVerifiedPurchase: false // Could be logic to verify purchase here
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
