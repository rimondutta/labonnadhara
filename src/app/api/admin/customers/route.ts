import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { escapeRegex } from '@/lib/regex-utils';
import { getSafeErrorMessage } from '@/lib/api-error';
// Ensure Order model is registered for the aggregation $lookup
import '@/models/Order';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session || !role || !['admin', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = (searchParams.get('search') ?? '').trim();
    const skip = (page - 1) * limit;

    const matchStage = search
      ? {
          role: 'customer',
          $or: [
            { name:  { $regex: escapeRegex(search), $options: 'i' } },
            { email: { $regex: escapeRegex(search), $options: 'i' } },
          ],
        }
      : { role: 'customer' };

    const [customers, total] = await Promise.all([
      User.aggregate([
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'orders',
            let: { email: '$email' },
            pipeline: [
              { $match: { $expr: { $eq: ['$customerEmail', '$$email'] } } },
              {
                $group: {
                  _id: null,
                  count:         { $sum: 1 },
                  totalSpent:    { $sum: '$totalAmount' },
                  lastOrderDate: { $max: '$createdAt' },
                },
              },
            ],
            as: 'orderStats',
          },
        },
        {
          $project: {
            _id:           1,
            name:          1,
            email:         1,
            createdAt:     1,
            ordersCount:   { $ifNull: [{ $first: '$orderStats.count' },         0]    },
            totalSpent:    { $ifNull: [{ $first: '$orderStats.totalSpent' },     0]    },
            lastOrderDate: { $ifNull: [{ $first: '$orderStats.lastOrderDate' },  null] },
          },
        },
      ]),
      User.countDocuments(matchStage),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin GET customers error:', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
