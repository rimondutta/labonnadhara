import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getBearerSession } from '@/lib/mobile-auth';
import { NextRequest } from 'next/server';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(req: NextRequest) {
  try {
    const session = await getBearerSession(req);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400, headers: CORS_HEADERS });
    }

    await connectToDatabase();
    
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404, headers: CORS_HEADERS });
    }

    if (user.image && user.image.includes('cloudinary.com')) {
      try {
        await deleteImage(user.image);
      } catch (err) {
        console.error('Failed to delete old Cloudinary image', err);
      }
    }

    const secureUrl = await uploadImage(imageBase64, 'users');

    user.image = secureUrl;
    await user.save();

    return NextResponse.json({ success: true, imageUrl: secureUrl }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('[POST /api/users/profile/image]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
