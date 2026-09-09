import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Construct base64 data URI readable by Cloudinary
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64Data}`;

    // Upload to Cloudinary under the "products" folder
    const secureUrl = await uploadImage(dataUri, "products");

    return NextResponse.json({ url: secureUrl }, { status: 200 });
  } catch (error: any) {
    console.error("Cloudinary upload route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
    }

    // Only allow deleting cloudinary images
    if (!url.includes('cloudinary.com')) {
      return NextResponse.json({ error: 'Only Cloudinary images can be deleted' }, { status: 400 });
    }

    await deleteImage(url);

    return NextResponse.json({ success: true, message: 'Image deleted from Cloudinary' });
  } catch (error: any) {
    console.error("Cloudinary delete route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
