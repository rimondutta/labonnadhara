import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBearerSession } from '@/lib/mobile-auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getBearerSession(req) || await getServerSession(authOptions);
    const { id } = await params;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    await connectToDatabase();

    const order = await Order.findOne({ 
      _id: id,
      customerEmail: session.user.email 
    }).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Single Order Fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
