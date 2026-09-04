import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin, isSuperAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Integration from "@/models/Integration";
import { encryptToken } from "@/lib/github/client";
import { notifyAdmins } from "@/lib/notifications/admin";
import { providerFields } from "@/lib/integrations/providers";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.email && (await isAdmin(session.user.email));
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.email && (await isSuperAdmin(session.user.email));
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const items = await Integration.find().sort({ createdAt: 1 }).lean();
    return NextResponse.json({ data: items.map((item) => {
      const credentials = Object.fromEntries(Object.keys(item.credentials ?? {}).map((key) => [key, "configured"]));
      const complete = providerFields[item.provider]?.every((field) => Boolean(credentials[field]));
      return { ...item, credentials, configured: Boolean(complete), status: item.status === "error" ? "error" : item.status === "connected" && complete ? "connected" : "incomplete" };
    }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { provider?: string; name?: string; role?: string; priority?: number; credentials?: Record<string, string> } | null;
  const provider = body?.provider?.trim().toLowerCase();
  const name = body?.name?.trim();
  if (!provider || !providerFields[provider] || !name) return NextResponse.json({ error: "A supported provider and name are required" }, { status: 400 });
  const credentials = Object.fromEntries(Object.entries(body?.credentials ?? {}).filter(([, value]) => value.trim()).map(([key, value]) => [key, encryptToken(value.trim())]));
  try {
    await connectToDatabase();
    if (provider !== "mongodb" && await Integration.exists({ provider })) return NextResponse.json({ error: "This provider is already registered" }, { status: 409 });
    const item = await Integration.create({ provider, name, role: body?.role, priority: body?.priority, credentials });
    await notifyAdmins(`${name} added`, `${name} (${provider}) was added and needs setup verification.`, "integration", String(item._id));
    return NextResponse.json({ data: { id: item._id, provider, name, enabled: true, credentials: Object.fromEntries(Object.keys(credentials).map((key) => [key, "configured"])), status: "incomplete", statusMessage: "Run a connection check" } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save integration" }, { status: 503 });
  }
}

