import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isSuperAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { getConnection } from "@/lib/db/connect";
import { pingDatabase } from "@/lib/db/health";
import Integration from "@/models/Integration";
import { encryptToken } from "@/lib/github/client";
import { providerFields } from "@/lib/integrations/providers";
import { notifyAdmins } from "@/lib/notifications/admin";
import { decryptToken } from "@/lib/github/client";

async function allowed() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.email && (await isSuperAdmin(session.user.email)));
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await allowed())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { name?: string; enabled?: boolean; check?: boolean; credentials?: Record<string, string> } | null;
  const update: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body?.enabled === "boolean") update.enabled = body.enabled;
  if (body?.credentials) update.credentials = Object.fromEntries(Object.entries(body.credentials).filter(([, value]) => value.trim() && value !== "configured").map(([key, value]) => [key, encryptToken(value.trim())]));
  try {
    await connectToDatabase();
    const current = await Integration.findById(params.id).select("provider name enabled credentials");
    if (!current) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    if (body?.check) {
      const stored = Object.fromEntries(current.credentials ?? new Map());
      const missing = (providerFields[current.provider] ?? []).filter((field) => !stored[field]);
      let status: "error" | "connected" = "connected";
      let statusMessage = "Connection is healthy";
      let latency: number | null = null;
      if (missing.length) { status = "error"; statusMessage = `Missing: ${missing.join(", ")}`; }
      else if (current.provider === "mongodb") {
        try { latency = await pingDatabase(await getConnection(decryptToken(stored.uri))); }
        catch { status = "error"; statusMessage = "Database not reachable"; }
      }
      const checked = await Integration.findByIdAndUpdate(params.id, { $set: { status, statusMessage, lastChecked: new Date(), lastCheckLatencyMs: latency, health: { status: status === "connected" ? "healthy" : "unhealthy", lastChecked: new Date(), latencyMs: latency, error: status === "error" ? statusMessage : null } } }, { new: true }).lean();
      await notifyAdmins(`${current.name} connection checked`, `${current.name} (${current.provider}): ${statusMessage}`, "integration", String(current._id));
      return NextResponse.json({ data: checked });
    }
    const item = await Integration.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
    if (!item) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    if (typeof body?.enabled === "boolean") await notifyAdmins(`${item.name} status changed`, `${item.name} was ${body.enabled ? "enabled" : "disabled"}.`, "integration", String(item._id));
    return NextResponse.json({ data: item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update integration" }, { status: 503 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await allowed())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const item = await Integration.findByIdAndDelete(params.id).select("name provider").lean();
    if (!item) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    await notifyAdmins(`${item.name} removed`, `${item.name} (${item.provider}) was removed from project integrations.`, "integration", String(item._id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete integration" }, { status: 503 });
  }
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await allowed())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const item = await Integration.findById(params.id).select("provider name enabled role priority status statusMessage lastChecked lastCheckLatencyMs health capacity credentials").lean();
    if (!item) return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    return NextResponse.json({ data: { ...item, credentials: Object.fromEntries(Object.keys(item.credentials ?? {}).map((key) => [key, "configured"])) } });
  } catch { return NextResponse.json({ error: "Unable to load integration" }, { status: 503 }); }
}