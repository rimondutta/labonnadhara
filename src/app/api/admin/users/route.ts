import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getSafeErrorMessage } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session || !role || !["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 401 });
    }

    const { name, email, password, role: targetRole } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignedRole = ["admin", "manager", "customer"].includes(targetRole) ? targetRole : "customer";

    // Non-super-admins cannot create other admins
    if (assignedRole === "admin" && role !== "admin") {
      return NextResponse.json({ error: "Only full administrators can create admin accounts" }, { status: 403 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "A user with this email address already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
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
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Admin POST /api/admin/users error:", error);
    return NextResponse.json({ error: getSafeErrorMessage(error) }, { status: 500 });
  }
}
