import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch the global settings
    const settings = await Settings.findOne({ key: 'global' });
    
    if (!settings || !settings.sizeGuide) {
      return NextResponse.json({ sizeGuide: { enabled: false, content: '' } });
    }

    return NextResponse.json({ sizeGuide: settings.sizeGuide });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
