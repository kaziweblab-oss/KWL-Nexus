/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentMethod from "@/models/PaymentMethod";
import { checkPaymentMethodHealth } from "@/lib/payments/health";
import { notifyAdmins } from "@/lib/notifications/admin";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const id = params.id;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid payment method ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const doc = await PaymentMethod.findById(id).lean();
    if (!doc || (doc as any).isDeleted) {
      return NextResponse.json({ error: "Payment method not found" }, { status: 404 });
    }

    // Manual methods: auto-success, no health check needed (bKash/Nagad/Rocket manual numbers)
    if ((doc as any).type === "manual") {
      const now = new Date();
      const updated = await PaymentMethod.findByIdAndUpdate(
        id,
        { $set: { status: "ACTIVE", "health.status": "HEALTHY", "health.lastChecked": now, "health.lastSuccessAt": now, "health.error": null, "health.errorCode": null, "health.latencyMs": 0, lastCheckedAt: now, "health.requestId": null } },
        { new: true }
      ).lean() as any;
      const maskedManual = {
        ...updated,
        gatewayConfig: updated?.gatewayConfig ? Object.fromEntries(Object.keys(updated.gatewayConfig).map((k) => [k, "configured"])) : {},
      };
      return NextResponse.json({ data: maskedManual, health: { status: "HEALTHY", latencyMs: 0, error: null, errorCode: null } });
    }

    // Reject if already CHECKING (prevent duplicate)
    if ((doc as any).status === "CHECKING" || (doc as any).health?.status === "CHECKING") {
      const last = (doc as any).lastCheckedAt ? new Date((doc as any).lastCheckedAt).getTime() : 0;
      if (Date.now() - last < 60 * 1000) {
        return NextResponse.json({ error: "Health check already in progress" }, { status: 409 });
      }
    }

    const requestId = new mongoose.Types.ObjectId().toString();
    const checkVersion = ((doc as any).health?.checkVersion ?? 0) + 1;
    const now = new Date();

    // Set to CHECKING
    const checkingUpdate = await PaymentMethod.findByIdAndUpdate(
      id,
      {
        $set: {
          status: "CHECKING",
          "health.status": "CHECKING",
          "health.lastChecked": now,
          lastCheckedAt: now,
          "health.requestId": requestId,
          "health.checkVersion": checkVersion,
        },
      },
      { new: true }
    ).lean();

    if (!checkingUpdate) {
      return NextResponse.json({ error: "Failed to start health check" }, { status: 500 });
    }

    // Notify: health check started (ephemeral, no need for deduplication)
    try {
      await notifyAdmins(
        "Checking payment gateway",
        `${checkingUpdate.name} (${checkingUpdate.slug}) health check started.`,
        "payment",
        undefined,
        String(checkingUpdate._id)
      );
    } catch {}

    // Perform real health check (with timeout 5s, single retry for TIMEOUT/NETWORK_ERROR is inside health.ts)
    const result = await checkPaymentMethodHealth(
      {
        _id: String(checkingUpdate._id),
        name: checkingUpdate.name,
        slug: checkingUpdate.slug,
        type: checkingUpdate.type as "manual" | "gateway",
        provider: checkingUpdate.provider,
        accountNumber: (checkingUpdate as any).accountNumber,
        gatewayConfig: (checkingUpdate as any).gatewayConfig,
      },
      { timeoutMs: 5000, retry: true }
    );

    // Validate that this check still belongs to current version (stale protection)
    const fresh = await PaymentMethod.findById(id).lean() as any;
    if (!fresh) {
      return NextResponse.json({ error: "Payment method was deleted during check" }, { status: 404 });
    }
    if (fresh.health?.requestId !== requestId || fresh.health?.checkVersion !== checkVersion) {
      // Stale result, another check or credential update happened, ignore this result
      return NextResponse.json({
        data: fresh,
        warning: "Stale health check result ignored due to concurrent update",
        health: {
          status: fresh.health?.status,
          lastChecked: fresh.health?.lastChecked,
        },
      });
    }

    // Determine new status
    const isHealthy = result.healthy;
    const newStatus = isHealthy ? "ACTIVE" : "FAILED";
    const newHealthStatus = isHealthy ? "HEALTHY" : "UNHEALTHY";
    const now2 = new Date();

    // Prepare update
    const update: Record<string, unknown> = {
      status: newStatus,
      "health.status": newHealthStatus,
      "health.lastChecked": now2,
      "health.latencyMs": result.latencyMs,
      lastCheckedAt: now2,
      "health.requestId": null,
    };

    if (isHealthy) {
      (update as any)["health.lastSuccessAt"] = now2;
      (update as any)["health.error"] = null;
      (update as any)["health.errorCode"] = null;
      (update as any)["health.consecutiveFailures"] = 0;
    } else {
      (update as any)["health.lastFailedAt"] = now2;
      (update as any)["health.error"] = result.error ? String(result.error).substring(0, 200) : "Health check failed";
      (update as any)["health.errorCode"] = result.errorCode || "UNKNOWN_ERROR";
      const prevFailures = (fresh.health?.consecutiveFailures ?? 0) as number;
      (update as any)["health.consecutiveFailures"] = prevFailures + 1;
    }

    // Important: enabled must remain as is, do not auto-enable on recovery
    // If it was enabled and now failed, it will be auto-disabled in the next cron or can be disabled here if threshold met
    // For manual check, we do NOT auto-disable on first failure, only update status to FAILED
    // The cron will handle auto-disable after 2 consecutive failures

    const updated = await PaymentMethod.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any;

    // Mask gatewayConfig for response
    const masked = {
      ...updated,
      gatewayConfig: updated.gatewayConfig ? Object.fromEntries(Object.keys(updated.gatewayConfig).map((k) => [k, "configured"])) : {},
    };

    // Notifications with deduplication (check recent notification within 5 min)
    try {
      const Notification = (await import("@/models/Notification")).default;
      const title = isHealthy ? "Payment gateway is healthy" : "Payment gateway health check failed";
      const message = isHealthy
        ? `${updated.name} (${updated.slug}) passed health check${result.latencyMs ? ` (latency ${result.latencyMs}ms)` : ""}.`
        : `${updated.name} (${updated.slug}) health check failed: ${result.errorCode || "UNKNOWN_ERROR"}${result.error ? ` - ${String(result.error).substring(0, 100)}` : ""}.`;

      // Dedup: check if same title for same paymentMethodId within 5 min exists
      const recent = await Notification.findOne({
        paymentMethodId: updated._id,
        title,
        createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
      }).lean();
      if (!recent) {
        await notifyAdmins(title, message, "payment", undefined, String(updated._id));
      }
    } catch {}

    return NextResponse.json({
      data: masked,
      health: {
        status: isHealthy ? "HEALTHY" : "UNHEALTHY",
        latencyMs: result.latencyMs,
        error: result.error,
        errorCode: result.errorCode,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Health check failed" }, { status: 500 });
  }
}
