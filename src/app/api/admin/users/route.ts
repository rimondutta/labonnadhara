import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';

const adminCreateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    email: z.string().trim().email('Valid email is required').max(160).transform((e) => e.toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
    role: z.enum(['admin', 'manager', 'customer']).default('customer'),
  })
  .strict();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = adminCreateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid user payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { name, email, password, role: assignedRole } = parsed.data;

    // Only a full admin can create another full admin account
    if (assignedRole === 'admin' && auth.session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Full Admins can create another Admin account' },
        { status: 403, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    await connectToDatabase();

    const existing = await User.findOne({ email }).select('_id').lean();
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201, headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Admin POST /api/admin/users error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
