import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin, isSuperAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Returns whether the current session belongs to an admin/superadmin (ADMIN_EMAILS + DB role).
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const admin = await isAdmin(email);
  const superAdmin = await isSuperAdmin(email);
  // role from token if available, else DB lookup
  let role: string = superAdmin ? "superadmin" : admin ? "admin" : "user";
  // Prefer token role if session has it
  const tokenRole = (session?.user as unknown as { role?: string })?.role;
  if (tokenRole) role = tokenRole;
  return NextResponse.json({ isAdmin: admin, isSuperAdmin: superAdmin, role, email: email ?? null });
}
