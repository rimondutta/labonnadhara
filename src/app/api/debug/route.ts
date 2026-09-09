import { NextResponse } from 'next/server';

// This endpoint has been disabled for production security.
export async function GET() {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
