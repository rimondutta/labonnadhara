import { NextResponse } from 'next/server';
import { getBearerSession } from '@/lib/mobile-auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * PUT /api/auth/mobile/update-profile
 *
 * Lets an authenticated mobile user update their name and/or profile image.
 * Role changes are intentionally not allowed here.
 *
 * Body: { name?: string; image?: string }
 * Response: { success: true, data: { id, name, email, role, image } }
 */
export async function PUT(req: NextRequest) {
  const session = await getBearerSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const allowedUpdates: Record<string, any> = {};

    if (body.name && typeof body.name === 'string') {
      allowedUpdates.name = body.name.trim();
    }
    if (body.image && typeof body.image === 'string') {
      allowedUpdates.image = body.image;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await connectToDatabase();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: allowedUpdates },
      { new: true, select: '-password' }
    ).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: (user as any)._id.toString(),
          name: (user as any).name,
          email: (user as any).email,
          role: (user as any).role,
          image: (user as any).image ?? null,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error('[PUT /api/auth/mobile/update-profile]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
