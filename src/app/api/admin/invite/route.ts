import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { randomBytes } from 'node:crypto';
import { getSafeErrorMessage } from '@/lib/api-error';

// ── Session type helper ───────────────────────────────────────
interface SessionUser { role?: string; id?: string }

/**
 * Generates a cryptographically secure 10-character temporary password.
 *
 * Uses rejection sampling (uniform distribution over the charset) to avoid
 * modulo bias. `Math.random()` is NOT used — it is not suitable for security
 * contexts.
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const result: string[] = [];
  // chars.length = 54; floor(256 / 54) * 54 = 216. Discard bytes >= 216.
  const limit = Math.floor(256 / chars.length) * chars.length;
  while (result.length < 10) {
    const byte = randomBytes(1)[0];
    if (byte < limit) result.push(chars[byte % chars.length]);
  }
  return result.join('');
}

/** Shared Nodemailer transport — reused across invite + reset functions. */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const SITE_URL = process.env.NEXTAUTH_URL || 'https://labonnadhara.shop';
const FROM_EMAIL = process.env.EMAIL_FROM || process.env.EMAIL_USER;

// ── GET: List all admin/manager users ────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const admins = await User.find({ role: { $in: ['admin', 'manager'] } })
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ admins });
  } catch (error: unknown) {
    console.error('[GET /api/admin/invite]', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

// ── POST: Invite a new admin ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, role } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'manager'];
    const assignedRole = validRoles.includes(role) ? role : 'manager';

    await connectToDatabase();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Cryptographically secure temp password — NEVER returned in API response
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
    });

    // Attempt to send invitation email
    let emailSent = false;
    try {
      await sendInviteEmail({
        toEmail: email,
        toName: name,
        role: assignedRole,
        tempPassword,
        loginUrl: `${SITE_URL}/admin/login`,
      });
      emailSent = true;
    } catch (emailError: unknown) {
      // Log internally — NEVER expose the temp password in logs or response
      console.error('[admin/invite] Email delivery failed for new admin account.', {
        targetEmail: email,
        role: assignedRole,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `Invitation email sent to ${email}`
        : `Admin account created but the invitation email could not be delivered. Please contact your system administrator to resend it.`,
      admin: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      emailSent,
      // tempPassword is intentionally NEVER included in the response
    });
  } catch (error: unknown) {
    console.error('[POST /api/admin/invite]', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

// ── PATCH: Reset an admin's password ─────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cryptographically secure temp password — NEVER returned in API response
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    user.password = hashedPassword;
    await user.save();

    // Attempt to send password reset email
    let emailSent = false;
    try {
      await sendPasswordResetEmail({
        toEmail: user.email,
        toName: user.name,
        tempPassword,
        loginUrl: `${SITE_URL}/admin/login`,
      });
      emailSent = true;
    } catch (emailError: unknown) {
      // Log internally — NEVER expose temp password in response
      console.error('[admin/invite] Password reset email delivery failed.', {
        targetEmail: user.email,
        error: emailError instanceof Error ? emailError.message : String(emailError),
      });
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? `New temporary password sent to ${user.email}`
        : `Password was reset but the notification email could not be delivered. Please contact the user directly to arrange login.`,
      emailSent,
      // tempPassword is intentionally NEVER included in the response
    });
  } catch (error: unknown) {
    console.error('[PATCH /api/admin/invite]', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

// ── DELETE: Remove an admin user ─────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === (session.user as SessionUser).id) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    await connectToDatabase();
    await User.findByIdAndDelete(userId);

    return NextResponse.json({ success: true, message: 'Admin removed' });
  } catch (error: unknown) {
    console.error('[DELETE /api/admin/invite]', error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}

// ── Email templates ───────────────────────────────────────────

async function sendInviteEmail(opts: {
  toEmail: string;
  toName: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const transporter = createTransport();
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="padding: 40px 20px; text-align: center; background-color: #000000; color: #ffffff;">
        <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 4px; font-size: 24px;">LABONNADHARA</h1>
        <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7; letter-spacing: 2px;">ADMIN INVITATION</p>
      </div>

      <div style="padding: 40px 20px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">You've Been Invited!</h2>
        <p>Hi ${opts.toName},</p>
        <p>You've been invited to join the <strong>Labonnadhara</strong> admin dashboard as a <strong>${opts.role === 'admin' ? 'Full Admin' : 'Manager'}</strong>.</p>

        <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #000000;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold;">Your Login Credentials:</p>
          <p style="margin: 0; font-size: 14px;">Email: <strong>${opts.toEmail}</strong></p>
          <p style="margin: 0; font-size: 14px;">Temporary Password: <strong>${opts.tempPassword}</strong></p>
        </div>

        <p style="font-size: 13px; color: #666;">Please change your password after your first login for security.</p>

        <div style="text-align: center; margin-top: 40px;">
          <a href="${opts.loginUrl}" style="display: inline-block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Go to Dashboard</a>
        </div>
      </div>

      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
        <p>&copy; ${new Date().getFullYear()} Labonnadhara. All rights reserved.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: opts.toEmail,
    subject: "You've been invited to Labonnadhara Admin Dashboard",
    html,
  });
}

async function sendPasswordResetEmail(opts: {
  toEmail: string;
  toName: string;
  tempPassword: string;
  loginUrl: string;
}) {
  const transporter = createTransport();
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333333; line-height: 1.6;">
      <div style="padding: 40px 20px; text-align: center; background-color: #000000; color: #ffffff;">
        <h1 style="margin: 0; text-transform: uppercase; letter-spacing: 4px; font-size: 24px;">LABONNADHARA</h1>
        <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.7; letter-spacing: 2px;">PASSWORD RESET</p>
      </div>

      <div style="padding: 40px 20px; background-color: #ffffff;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">Your Password Has Been Reset</h2>
        <p>Hi ${opts.toName},</p>
        <p>An administrator has reset your password for the <strong>Labonnadhara</strong> dashboard. Please use the new credentials below to log in.</p>

        <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-left: 4px solid #000000;">
          <p style="margin: 0 0 10px; font-size: 14px; font-weight: bold;">Your New Login Credentials:</p>
          <p style="margin: 0; font-size: 14px;">Email: <strong>${opts.toEmail}</strong></p>
          <p style="margin: 0; font-size: 14px;">New Password: <strong>${opts.tempPassword}</strong></p>
        </div>

        <p style="font-size: 13px; color: #666;">Please change your password after logging in for security.</p>

        <div style="text-align: center; margin-top: 40px;">
          <a href="${opts.loginUrl}" style="display: inline-block; padding: 15px 30px; background-color: #000000; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Go to Dashboard</a>
        </div>
      </div>

      <div style="padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
        <p>&copy; ${new Date().getFullYear()} Labonnadhara. All rights reserved.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: opts.toEmail,
    subject: 'Your Labonnadhara Dashboard Password Has Been Reset',
    html,
  });
}
