import { NextResponse } from 'next/server';
import { getBearerSession } from '@/lib/mobile-auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { NextRequest } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * GET /api/auth/mobile/me
 *
 * Returns the current user's profile from the Bearer JWT.
 * Used by the mobile AuthContext on app resume to:
 *   1. Validate the stored token is still valid
 *   2. Refresh user data (name, role, image) from the DB
 *
 * Response: { success: true, data: { id, name, email, role, image } }
 */
export async function GET(req: NextRequest) {
  const session = await getBearerSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    await connectToDatabase();
    const user = await User.findById(session.user.id).select('-password').lean();

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
    console.error('[GET /api/auth/mobile/me]', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}
