import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';
import { getSafeErrorMessage } from '@/lib/api-error';

export async function GET(req: Request) {
  try {
    // 1. Defense-in-depth Authentication & Authorization
    const session = (await getBearerSession(req)) || (await getServerSession(authOptions));
    if (!session) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const role = (session.user as { role?: string })?.role;
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or manager access required' }, { status: 403 });
    }

    await dbConnect();
    // Fetch all blogs, regardless of published status (for admin management)
    const posts = await BlogPost.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(posts);
  } catch (error: unknown) {
    console.error('Admin GET blogs error:', error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500 }
    );
  }
}
