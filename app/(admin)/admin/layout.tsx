import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";

// Keep a second server-side guard in addition to middleware for defense in depth.
// Uses DB+env check so dashboard-managed admins also pass.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/api/auth/signin?callbackUrl=/admin");
  if (!(await isAdmin(session.user.email))) redirect("/?error=admin_access_required");
  return <AdminShell>{children}</AdminShell>;
}
