import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import Product from '@/models/Product';
import { deleteImage } from '@/lib/cloudinary';
import { touchProductsTimestamp } from '@/lib/lastUpdated';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;
    const product = await Product.findById(id).populate('category', 'name');

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error: unknown) {
    console.error('Admin GET product by ID error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    // Sanitize image URLs to prevent next/image crash
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.filter((img: { url?: string }) => img.url && (img.url.startsWith('http') || img.url.startsWith('/')));
    }

    await connectToDatabase();
    const { id } = await params;

    // Fetch existing product to compare images
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Identify images being removed
    const existingUrls = existingProduct.images?.map((img: { url?: string }) => img.url || '').filter(Boolean) || [];
    const newUrls = data.images?.map((img: { url?: string }) => img.url || '').filter(Boolean) || [];
    const urlsToDelete = existingUrls.filter((url: string) => !newUrls.includes(url) && url.includes('cloudinary.com'));

    // Delete removed images from Cloudinary
    for (const url of urlsToDelete) {
      try {
        await deleteImage(url);
      } catch (cloudinaryError) {
        console.error(`Failed to delete replaced Cloudinary image: ${url}`, cloudinaryError);
      }
    }

    const product = await Product.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
    revalidatePath('/products');
    if (product?.slug) {
      revalidatePath(`/products/${product.slug}`);
    }

    // Bump last-updated so mobile polling detects this update
    await touchProductsTimestamp();

    // Invalidate Redis caches
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('products:*', `product:*:*`);

    return NextResponse.json({ product });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 400 }
      );
    }
    console.error('Admin PUT product error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    // Find the product first to get image URLs
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete images from Cloudinary if they exist
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.url && img.url.includes('cloudinary.com')) {
          try {
            await deleteImage(img.url);
          } catch (cloudinaryError) {
            console.error(`Failed to delete Cloudinary image: ${img.url}`, cloudinaryError);
          }
        }
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(id);

    // Bump last-updated so mobile polling detects this deletion
    await touchProductsTimestamp();

    // Invalidate Redis caches
    const { invalidateCache } = await import('@/lib/cache');
    await invalidateCache('products:*', `product:*:*`);

    return NextResponse.json({ message: 'Product and associated images deleted' });
  } catch (error: unknown) {
    console.error('Admin DELETE product error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
