import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentMethod from "@/models/PaymentMethod";
import { notifyAdmins } from "@/lib/notifications/admin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return false;
  if (!(await isAdmin(session.user.email))) return false;
  try {
    await connectToDatabase();
  } catch {
    return false;
  }
  return true;
}

function maskGatewayConfig(doc: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...doc } as Record<string, unknown>;
  if (masked.gatewayConfig && typeof masked.gatewayConfig === "object" && masked.gatewayConfig !== null) {
    const cfg = masked.gatewayConfig as Record<string, unknown>;
    masked.gatewayConfig = Object.fromEntries(Object.keys(cfg).map((k) => [k, "configured"]));
  }
  return masked;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    // Auto-migrate legacy manual methods that are still NOT_CHECKED / UNKNOWN -> ACTIVE / HEALTHY (no health check needed for manual)
    const now = new Date();
    await PaymentMethod.updateMany(
      { isDeleted: false, type: "manual", $or: [{ status: "NOT_CHECKED" }, { "health.status": "UNKNOWN" }, { status: { $exists: false } }] },
      { $set: { status: "ACTIVE", "health.status": "HEALTHY", "health.lastChecked": now, "health.lastSuccessAt": now, "health.error": null, "health.errorCode": null, lastCheckedAt: now } }
    );
    const methods = await PaymentMethod.find({ isDeleted: false }).sort({ order: 1, createdAt: 1 }).lean();
    const masked = methods.map((m) => maskGatewayConfig(m as unknown as Record<string, unknown>));
    return NextResponse.json({ data: masked });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json();
    const { name, slug, type, provider, accountNumber, instructions, qrImageUrl, order, icon, gatewayConfig } = body;
    if (!name || !slug) return NextResponse.json({ error: "name and slug required" }, { status: 400 });
    if (!/^[a-z0-9_-]+$/.test(String(slug).toLowerCase())) return NextResponse.json({ error: "slug must be a-z0-9_-" }, { status: 400 });
    const exists = await PaymentMethod.findOne({ slug: String(slug).toLowerCase(), isDeleted: false }).lean();
    if (exists) return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    // Validate gatewayConfig allowlist per provider (prevent __proto__ and large payload)
    if (gatewayConfig && typeof gatewayConfig === "object" && gatewayConfig !== null) {
      const jsonLen = JSON.stringify(gatewayConfig).length;
      if (jsonLen > 10240) return NextResponse.json({ error: "gatewayConfig too large" }, { status: 400 });
      if (Object.prototype.hasOwnProperty.call(gatewayConfig as Record<string, unknown>, "__proto__") || Object.prototype.hasOwnProperty.call(gatewayConfig as Record<string, unknown>, "constructor")) {
        return NextResponse.json({ error: "Invalid gatewayConfig" }, { status: 400 });
      }
    }
    const isManual = type !== "gateway";
    const now = new Date();
    const doc = await PaymentMethod.create({
      name,
      slug: String(slug).toLowerCase(),
      type: type === "gateway" ? "gateway" : "manual",
      provider: provider ?? "",
      accountNumber: accountNumber ?? "",
      instructions: instructions ?? "",
      qrImageUrl: qrImageUrl ?? "",
      enabled: false,
      order: Number(order) || 0,
      icon: icon ?? "",
      gatewayConfig: gatewayConfig ?? {},
      status: isManual ? "ACTIVE" : "NOT_CHECKED",
      health: isManual
        ? {
            status: "HEALTHY",
            lastChecked: now,
            lastSuccessAt: now,
            lastFailedAt: null,
            latencyMs: 0,
            error: null,
            errorCode: null,
            consecutiveFailures: 0,
            checkVersion: 0,
            requestId: null,
          }
        : {
            status: "UNKNOWN",
            lastChecked: null,
            lastSuccessAt: null,
            lastFailedAt: null,
            latencyMs: null,
            error: null,
            errorCode: null,
            consecutiveFailures: 0,
            checkVersion: 0,
            requestId: null,
          },
      lastCheckedAt: isManual ? now : null,
      isDeleted: false,
    });
    try {
      if (isManual) {
        await notifyAdmins("Payment method added", `${doc.name} (${doc.slug}) was added and is ready (manual — no health check required).`, "payment", undefined, String(doc._id));
      } else {
        await notifyAdmins("Payment gateway added", `${doc.name} (${doc.slug}) was added. Health check is required before activation.`, "payment", undefined, String(doc._id));
      }
    } catch {}
    const masked = maskGatewayConfig(doc.toObject() as unknown as Record<string, unknown>);
    return NextResponse.json({ data: masked }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }
}
