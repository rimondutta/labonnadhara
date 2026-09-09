import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Settings from '@/models/Settings';

// Revalidate every 60 seconds
export const revalidate = 60;

export async function GET() {
  try {
    await connectToDatabase();
    const settings = await Settings.findOne({ key: 'global' }).lean();

    const defaults = {
      insideDhakaRate: 120,
      outsideDhakaRate: 150,
      freeShippingEnabled: false,
      freeShippingMinOrder: 0,
      freeShippingZone: 'all',
    };

    if (!settings) {
      return NextResponse.json(defaults);
    }

    const shipping = (settings as any).shipping ?? {};

    return NextResponse.json({
      insideDhakaRate: shipping.insideDhakaRate ?? defaults.insideDhakaRate,
      outsideDhakaRate: shipping.outsideDhakaRate ?? defaults.outsideDhakaRate,
      freeShippingEnabled: shipping.freeShippingEnabled ?? defaults.freeShippingEnabled,
      freeShippingMinOrder: shipping.freeShippingMinOrder ?? defaults.freeShippingMinOrder,
      freeShippingZone: shipping.freeShippingZone ?? defaults.freeShippingZone,
    });
  } catch {
    // Fail gracefully — never break the checkout
    return NextResponse.json({
      insideDhakaRate: 120,
      outsideDhakaRate: 150,
      freeShippingEnabled: false,
      freeShippingMinOrder: 0,
      freeShippingZone: 'all',
    });
  }
}
