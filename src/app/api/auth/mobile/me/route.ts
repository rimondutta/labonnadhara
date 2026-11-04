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
 * GET /api/auth/mobile/me
 *
 * Returns the current user's profile from the Bearer JWT.
 * Used by the mobile AuthContext on app resume to:
 *   1. Validate the stored token is still valid
 *   2. Refresh user data (name, role, image) from the DB
 */
export async function GET(req: NextRequest) {
  const CORS_HEADERS = mobileCorsHeaders(req);
  const session = await getBearerSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id).select('-password').lean() as UserDoc | null;

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
    console.error('[GET /api/auth/mobile/me]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: mobileCorsHeaders(req) }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
