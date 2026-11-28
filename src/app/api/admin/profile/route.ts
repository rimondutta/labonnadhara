import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getSafeErrorMessage } from '@/lib/api-error';
import { requireAdminOrManager, PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Name too long'),
  image: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => !val || val.startsWith('https://') || val.startsWith('/'),
      'Invalid profile image URL'
    )
    .optional()
    .nullable(),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(72, 'New password must be at most 72 characters'),
}).strict();

// PUT: Update own admin/manager profile (name, image)
export async function PUT(req: Request) {
  try {
    const auth = await requireAdminOrManager(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid profile data' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const updateFields: { name: string; image?: string } = {
      name: parsed.data.name,
    };
    if (parsed.data.image !== undefined) {
      updateFields.image = parsed.data.image ?? '';
    }

    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { _id: auth.session.user.id, role: { $in: ['admin', 'manager'] } },
      { $set: updateFields },
      { returnDocument: 'after' }
    ).select('name image role');

    if (!user) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, user: { name: user.name, image: user.image, role: user.role } },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Profile update error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}

// PATCH: Change own admin/manager password
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminOrManager(req, true);
    if (auth.errorResponse) return auth.errorResponse;

    const rawBody = await req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid password update payload' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    await connectToDatabase();

    const user = await User.findOne({
      _id: auth.session.user.id,
      role: { $in: ['admin', 'manager'] },
    }).select('+password');

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    return NextResponse.json(
      { success: true, message: 'Password updated successfully' },
      { headers: PRIVATE_NO_STORE_HEADERS }
    );
  } catch (error: unknown) {
    console.error('Password change error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { error: getSafeErrorMessage(error) },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS }
    );
  }
}
