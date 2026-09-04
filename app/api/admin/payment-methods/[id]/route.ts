import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentMethod from "@/models/PaymentMethod";
import { notifyAdmins } from "@/lib/notifications/admin";

export const dynamic = "force-dynamic";

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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = (await request.json()) as Record<string, unknown> & { check?: boolean };
    // Handle health check request via PUT {check:true} for backward compat (prefer POST /check)
    if (body.check === true) {
      return NextResponse.json({ error: "Use POST /api/admin/payment-methods/[id]/check for health checks" }, { status: 400 });
    }

    const doc = await PaymentMethod.findById(params.id).lean() as Record<string, unknown> | null;
    if (!doc || (doc as Record<string, unknown>).isDeleted) return NextResponse.json({ error: "Payment method not found" }, { status: 404 });

    // Backend enable guard: only gateway needs ACTIVE/HEALTHY, manual auto-success
    if (body.enabled === true) {
      const docType = (doc as Record<string, unknown>).type as string | undefined;
      if (docType !== "manual") {
        const status = (doc as Record<string, unknown>).status as string | undefined;
        const healthStatus = ((doc as Record<string, unknown>).health as Record<string, unknown> | undefined)?.status as string | undefined;
        if (status !== "ACTIVE" || healthStatus !== "HEALTHY") {
          return NextResponse.json({ error: "Health check required before activation." }, { status: 400 });
        }
      }
    }

    // Detect credential/config change that invalidates health
    const credFields = ["provider", "type", "accountNumber", "gatewayConfig"];
    const hasCredChange = credFields.some((f) => f in body);
    const update: Record<string, unknown> = {};
    const fields = ["name", "slug", "type", "provider", "accountNumber", "instructions", "qrImageUrl", "enabled", "order", "icon", "gatewayConfig"];
    for (const f of fields) if (f in body) update[f] = body[f];

    // Validate gatewayConfig allowlist and size
    if ("gatewayConfig" in update && update.gatewayConfig && typeof update.gatewayConfig === "object" && update.gatewayConfig !== null) {
      const cfg = update.gatewayConfig as Record<string, unknown>;
      if (JSON.stringify(cfg).length > 10240) return NextResponse.json({ error: "gatewayConfig too large" }, { status: 400 });
      if (Object.prototype.hasOwnProperty.call(cfg, "__proto__") || Object.prototype.hasOwnProperty.call(cfg, "constructor")) {
        return NextResponse.json({ error: "Invalid gatewayConfig" }, { status: 400 });
      }
    }

    if (update.slug) {
      update.slug = String(update.slug).toLowerCase();
      if (!/^[a-z0-9_-]+$/.test(update.slug as string)) return NextResponse.json({ error: "slug must be a-z0-9_-" }, { status: 400 });
      const conflict = await PaymentMethod.findOne({ slug: update.slug, _id: { $ne: params.id }, isDeleted: false }).lean();
      if (conflict) return NextResponse.json({ error: "slug already exists" }, { status: 409 });
    }
    if (update.type && !["manual", "gateway"].includes(update.type as string)) update.type = "manual";
    if (update.order !== undefined) update.order = Number(update.order) || 0;

    // Credential/config change invalidation
    if (hasCredChange) {
      const newType = (update.type as string) ?? ((doc as Record<string, unknown>).type as string);
      const isManualNow = newType === "manual";
      if (isManualNow) {
        // Manual: auto-success, no health check needed
        const now = new Date();
        update.status = "ACTIVE";
        (update as Record<string, unknown>)["health.status"] = "HEALTHY";
        (update as Record<string, unknown>)["health.lastChecked"] = now;
        (update as Record<string, unknown>)["health.lastSuccessAt"] = now;
        (update as Record<string, unknown>)["health.error"] = null;
        (update as Record<string, unknown>)["health.errorCode"] = null;
        (update as Record<string, unknown>)["health.latencyMs"] = 0;
        (update as Record<string, unknown>)["health.consecutiveFailures"] = 0;
        (update as Record<string, unknown>)["health.requestId"] = null;
        (update as Record<string, unknown>).lastCheckedAt = now;
        const prevVersion = ((doc as Record<string, unknown>).health as Record<string, unknown> | undefined)?.checkVersion as number | undefined ?? 0;
        (update as Record<string, unknown>)["health.checkVersion"] = prevVersion + 1;
        // keep current enabled intent but allow immediate enable (no block)
      } else {
        // Gateway: reset to NOT_CHECKED / UNKNOWN, require health check
        update.enabled = false;
        update.status = "NOT_CHECKED";
        (update as Record<string, unknown>)["health.status"] = "UNKNOWN";
        (update as Record<string, unknown>)["health.lastChecked"] = null;
        (update as Record<string, unknown>)["health.error"] = null;
        (update as Record<string, unknown>)["health.errorCode"] = null;
        (update as Record<string, unknown>)["health.latencyMs"] = null;
        (update as Record<string, unknown>)["health.consecutiveFailures"] = 0;
        (update as Record<string, unknown>)["health.requestId"] = null;
        (update as Record<string, unknown>).lastCheckedAt = null;
        const prevVersion = ((doc as Record<string, unknown>).health as Record<string, unknown> | undefined)?.checkVersion as number | undefined ?? 0;
        (update as Record<string, unknown>)["health.checkVersion"] = prevVersion + 1;
        if (body.enabled === true) {
          update.enabled = false;
        }
      }
    } else if (update.enabled === true) {
      // Non-cred enable: already guarded above, but also need to ensure health is still valid (not stale)
      // No additional handling
    }

    const updated = await PaymentMethod.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean() as Record<string, unknown> | null;
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Notifications
    try {
      const isEnabledChange = "enabled" in update;
      const isCredChange = hasCredChange;
      if (isCredChange) {
        await notifyAdmins("Payment gateway updated", `${String(updated.name)} (${String(updated.slug)}) configuration was updated. A new health check is required.`, "payment", undefined, String(updated._id));
      }
      if (isEnabledChange) {
        const title = (update.enabled as boolean) ? "Payment gateway enabled" : "Payment gateway disabled";
        const msg = `${String(updated.name)} (${String(updated.slug)}) was ${update.enabled ? "enabled" : "disabled"}.`;
        await notifyAdmins(title, msg, "payment", undefined, String(updated._id));
      }
      if (!isCredChange && !isEnabledChange && ("name" in update || "slug" in update)) {
        await notifyAdmins("Payment gateway updated", `${String(updated.name)} (${String(updated.slug)}) was updated.`, "payment", undefined, String(updated._id));
      }
    } catch {}

    const masked = maskGatewayConfig(updated);
    return NextResponse.json({ data: masked });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const doc = await PaymentMethod.findById(params.id).lean() as Record<string, unknown> | null;
    if (!doc || (doc as Record<string, unknown>).isDeleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Soft delete
    await PaymentMethod.findByIdAndUpdate(params.id, { $set: { isDeleted: true, deletedAt: new Date(), enabled: false, status: "FAILED", "health.status": "UNHEALTHY" } });
    try {
      await notifyAdmins("Payment gateway removed", `${String((doc as Record<string, unknown>).name)} (${String((doc as Record<string, unknown>).slug)}) was removed.`, "payment", undefined, String((doc as Record<string, unknown>)._id));
    } catch {}
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }
}
