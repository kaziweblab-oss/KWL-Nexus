import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";

// Admin guard for /admin/* when accessed via spec path app/admin/*
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/admin");
  if (!(await isAdmin(session.user.email))) redirect("/?error=admin_access_required");
  return <AdminShell>{children}</AdminShell>;
}
