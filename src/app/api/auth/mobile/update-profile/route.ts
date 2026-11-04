import { NextResponse } from 'next/server';
import { getBearerSession } from '@/lib/mobile-auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { NextRequest } from 'next/server';
import { mobileCorsHeaders } from '@/lib/cors';

interface UserDoc {
  _id: { toString(): string };
  name: string;
  email: string;
  role: string;
  image?: string;
}

/**
 * PUT /api/auth/mobile/update-profile
 *
 * Lets an authenticated mobile user update their name and/or profile image.
 * Role changes are intentionally not allowed here.
 */
export async function PUT(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  const session = await getBearerSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await req.json();
    const allowedUpdates: Record<string, string> = {};

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
      { returnDocument: 'after', select: '-password' }
    ).lean() as UserDoc | null;

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
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image ?? null,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    console.error('[PUT /api/auth/mobile/update-profile]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
