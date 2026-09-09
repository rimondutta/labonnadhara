import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BlogPost from '@/models/BlogPost';

export async function GET() {
  try {
    await dbConnect();
    // Fetch all blogs, regardless of published status
    const posts = await BlogPost.find({})
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(posts);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}
