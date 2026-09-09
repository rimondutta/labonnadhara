import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { touchProductsTimestamp } from '@/lib/lastUpdated';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const [products, total] = await Promise.all([
      Product.find({}).select('-__v').populate('category', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments({}),
    ]);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    // Sanitize image URLs to prevent next/image crash
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.filter((img: any) => img.url && (img.url.startsWith('http') || img.url.startsWith('/')));
    }

    await connectToDatabase();
    const product = await Product.create(data);

    // Bump last-updated timestamp so mobile polling detects this new product
    await touchProductsTimestamp();

    // Invalidate Redis caches
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('products:*', 'product:*');

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
