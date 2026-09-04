import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { IntegrationsManager } from "@/components/admin/IntegrationsManager";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) notFound();
  return <IntegrationsManager />;
}
