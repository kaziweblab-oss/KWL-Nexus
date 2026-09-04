import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import AppVersion from "@/models/AppVersion";
import App from "@/models/App";

export const dynamic = "force-dynamic";

const schema = z.object({
  version: z.string().min(1),
  rollbackTo: z.string().min(1),
  notes: z.string().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !isAdminEmail(session.user.email)) return null;
  await connectToDatabase();
  return true;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rollbackTo, notes } = parsed.data;
  const app = await App.findById(params.id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  app.latestVersion = rollbackTo;
  if (notes) app.description = app.description;
  await app.save();

  await AppVersion.create({
    appId: params.id,
    version: rollbackTo,
    notes: notes ?? `Rolled back to ${rollbackTo}`,
    changedBy: "admin",
    isCurrent: true,
  });

  return NextResponse.json({ data: { id: app._id, latestVersion: app.latestVersion } });
}
