import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await dbConnect();
    // Fetch all blogs, regardless of published status (for admin management)
    const posts = await BlogPost.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(posts, { headers: PRIVATE_NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('[GET /api/admin/blogs]', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
