import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Integration from "@/models/Integration";
import { IntegrationManageClient } from "@/components/admin/IntegrationManageClient";

export default async function IntegrationManagePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) notFound();
  await connectToDatabase();
  const item = await Integration.findById(params.id).select("name provider enabled status statusMessage lastCheckLatencyMs credentials").lean();
  if (!item) notFound();
  return <IntegrationManageClient item={{ ...item, _id: String(item._id), credentials: Object.fromEntries(Object.keys(item.credentials ?? {}).map((key) => [key, "configured"])) }} />;
}
