import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth/auth";
import { getAdminEmails, isSuperAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return { error: "Unauthorized", status: 401 as const };
  const ok = await isSuperAdmin(email);
  if (!ok) return { error: "Super admin access required", status: 403 as const };
  return { email: email.toLowerCase(), session };
}

const emailSchema = z.object({ email: z.string().email() });

// List all admins + superadmins (DB + env seed)
export async function GET() {
  const check = await requireSuperAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  await connectToDatabase();
  const envEmails = getAdminEmails(); // always superadmin
  const dbAdmins = await User.find({ role: { $in: ["admin", "superadmin"] } })
    .select("email name role image createdAt")
    .sort({ role: -1, email: 1 })
    .lean();

  // Merge env-only admins that may not exist in DB yet
  const dbEmailSet = new Set(dbAdmins.map((u) => String(u.email).toLowerCase()));
  const envOnly = envEmails
    .filter((e) => !dbEmailSet.has(e))
    .map((email) => ({
      _id: `env-${email}`,
      email,
      name: email.split("@")[0],
      role: "superadmin" as const,
      image: null,
      createdAt: null,
      isEnv: true,
    }));

  const merged = [
    ...envOnly,
    ...dbAdmins.map((u) => ({ ...u, isEnv: envEmails.includes(String(u.email).toLowerCase()) })),
  ];

  return NextResponse.json({ data: merged, currentEmail: check.email });
}

// Add new admin (role: admin). Only superadmin.
export async function POST(req: NextRequest) {
  const check = await requireSuperAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();

  await connectToDatabase();

  // System-managed emails are already superadmin, cannot override here
  const envEmails = getAdminEmails();
  if (envEmails.includes(email)) {
    return NextResponse.json({ error: "This email is already a system admin and cannot be modified here" }, { status: 409 });
  }

  let user = await User.findOne({ email });
  if (user) {
    if (user.role === "admin" || user.role === "superadmin") {
      return NextResponse.json({ error: "User is already an admin" }, { status: 409 });
    }
    user.role = "admin";
    await user.save();
  } else {
    user = await User.create({ email, name: email.split("@")[0], role: "admin" });
  }

  return NextResponse.json({ success: true, data: { email: user.email, role: user.role } });
}

// Remove admin (downgrade to user). Only superadmin, cannot remove self or env admin.
export async function DELETE(req: NextRequest) {
  const check = await requireSuperAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = emailSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const current = check.email;

  if (email === current) {
    return NextResponse.json({ error: "You cannot remove your own admin access" }, { status: 400 });
  }

  const envEmails = getAdminEmails();
  if (envEmails.includes(email)) {
    return NextResponse.json({ error: "System-managed admin cannot be removed here" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
  }

  user.role = "user";
  await user.save();

  return NextResponse.json({ success: true });
}

// Toggle super admin status (admin <-> superadmin) — system-wide, reflects as if env file updated. Only superadmin, cannot toggle self.
export async function PATCH(req: NextRequest) {
  const check = await requireSuperAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = z.object({ email: z.string().email() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid email required" }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const current = check.email;

  if (email === current) {
    return NextResponse.json({ error: "You cannot change your own super admin status" }, { status: 400 });
  }

  const envEmails = getAdminEmails();
  if (envEmails.includes(email)) {
    return NextResponse.json({ error: "System-managed admin role is managed centrally and cannot be changed here" }, { status: 400 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (user.role !== "admin" && user.role !== "superadmin") {
    return NextResponse.json({ error: "User is not an admin" }, { status: 400 });
  }

  user.role = user.role === "superadmin" ? "admin" : "superadmin";
  await user.save();

  return NextResponse.json({ success: true, data: { email: user.email, role: user.role } });
}
