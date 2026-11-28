import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { checkRateLimit, getClientIp } from '@/lib/ratelimit';
import { mobileCorsHeaders } from '@/lib/cors';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/auth-guards';
import { getSafeErrorMessage } from '@/lib/api-error';

const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80, 'Name must be 80 characters or less'),
    email: z.string().trim().email('Please provide a valid email address').max(160).transform((e) => e.toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters'),
  })
  .strict();

export async function POST(request: Request) {
  const headers = { ...mobileCorsHeaders(request), ...PRIVATE_NO_STORE_HEADERS };
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(ip, 'auth');
    if (rateLimit.isLimited) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many registration attempts. Please try again later.',
          message: 'Too many registration attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            ...headers,
            'Retry-After': String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const bodyObj = rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : null;
    const candidate = bodyObj
      ? { name: bodyObj.name, email: bodyObj.email, password: bodyObj.password }
      : null;

    const parsed = registerSchema.safeParse(candidate);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Invalid registration data';
      return NextResponse.json({ success: false, error: msg, message: msg }, { status: 400, headers });
    }

    const { name, email, password } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email }).select('_id').lean();
    if (existingUser) {
      const msg = 'An account with this email already exists';
      return NextResponse.json({ success: false, error: msg, message: msg }, { status: 400, headers });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'customer',
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201, headers }
    );
  } catch (error: unknown) {
    console.error('Registration Error:', getSafeErrorMessage(error));
    return NextResponse.json(
      { success: false, error: 'Internal Server Error', message: 'Internal Server Error' },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: mobileCorsHeaders(request) });
}
