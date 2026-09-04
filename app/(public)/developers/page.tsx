import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { DevelopersContent } from "@/components/developers/DevelopersContent";

// Only users listed in ADMIN_EMAILS may view the developers landing.
// Regular users see only profile, their apps, and All Products (/apps).
export default async function DevelopersPage() {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session?.user?.email))) {
    redirect("/?error=admin_access_required");
  }
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-24 pt-20 lg:px-8">
      <DevelopersContent />
    </main>
  );
}
