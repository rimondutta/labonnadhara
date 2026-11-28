import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (auth.errorResponse) return auth.errorResponse;

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const search = (searchParams.get('search') ?? '').trim().slice(0, 100);
    const skip = (page - 1) * limit;

    const escapedSearch = search ? escapeRegex(search) : '';
    const matchStage = escapedSearch
      ? {
          role: 'customer',
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { email: { $regex: escapedSearch, $options: 'i' } },
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
                  count: { $sum: 1 },
                  totalSpent: { $sum: '$totalAmount' },
                  lastOrderDate: { $max: '$createdAt' },
                },
              },
            ],
            as: 'orderStats',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            createdAt: 1,
            ordersCount: { $ifNull: [{ $first: '$orderStats.count' }, 0] },
            totalSpent: { $ifNull: [{ $first: '$orderStats.totalSpent' }, 0] },
            lastOrderDate: { $ifNull: [{ $first: '$orderStats.lastOrderDate' }, null] },
          },
        },
      ]),
      User.countDocuments(matchStage),
    ]);

    return NextResponse.json(
      {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Admin GET customers error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
