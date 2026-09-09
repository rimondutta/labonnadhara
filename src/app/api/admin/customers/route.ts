import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
// Make sure Order is loaded for aggregation
import Order from '@/models/Order'; 

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Fetch all customers, joining with their orders
    const customers = await User.aggregate([
      {
        $match: { role: 'customer' }
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'email',
          foreignField: 'customerEmail',
          as: 'orders'
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          createdAt: 1,
          ordersCount: { $size: "$orders" },
          totalSpent: { $sum: "$orders.totalAmount" },
          lastOrderDate: { $max: "$orders.createdAt" }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
