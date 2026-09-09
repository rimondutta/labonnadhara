import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

// Revalidate every 60 seconds — low DB load, near-instant update propagation
export const revalidate = 60;

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await Settings.findOne({ key: 'global' }).lean();

    if (!settings) {
      return NextResponse.json({ pixelId: '', enabled: false });
    }

    const { pixelId = '', enabled = false } = (settings as any).facebookPixel ?? {};

    // NEVER expose testEventCode publicly
    return NextResponse.json({ pixelId, enabled });
  } catch (error: any) {
    // Fail gracefully — pixel failure must never break the storefront
    return NextResponse.json({ pixelId: '', enabled: false });
  }
}
