import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentMethod from "@/models/PaymentMethod";
import { checkPaymentMethodHealth } from "@/lib/payments/health";
import { notifyAdmins } from "@/lib/notifications/admin";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const auth = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET) return false;
  return auth === expected;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleCron();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handleCron();
}

async function handleCron() {
  try {
    await connectToDatabase();

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Enabled gateways: check every 5 minutes (only gateway type — manual bKash/Nagad/Rocket are auto-HEALTHY, no check needed)
    const enabledGateways = await PaymentMethod.find({
      isDeleted: false,
      type: "gateway",
      enabled: true,
      $or: [
        { lastCheckedAt: null },
        { lastCheckedAt: { $lte: fiveMinutesAgo } },
        { status: "CHECKING" as const, lastCheckedAt: { $lte: new Date(now.getTime() - 60 * 1000) } }, // stuck CHECKING >60s
      ],
    })
      .select("+gatewayConfig")
      .lean();

    // FAILED gateways for recovery: check every 1 hour (only gateway type)
    const failedGateways = await PaymentMethod.find({
      isDeleted: false,
      type: "gateway",
      status: "FAILED",
      enabled: false,
      $or: [
        { lastCheckedAt: null },
        { lastCheckedAt: { $lte: oneHourAgo } },
        { "health.lastChecked": null },
        { "health.lastChecked": { $lte: oneHourAgo } },
      ],
    })
      .select("+gatewayConfig")
      .lean();

    // Deduplicate by _id (in case a gateway is both enabled and failed - shouldn't happen, but just in case)
    const allCandidates = [...enabledGateways];
    for (const m of failedGateways) {
      const id = String((m as Record<string, unknown>)._id);
      if (!allCandidates.find((x) => String((x as Record<string, unknown>)._id) === id)) {
        allCandidates.push(m);
      }
    }

    // Filter out those already CHECKING (unless stuck >60s, already handled)
    const toCheck = allCandidates.filter((m) => {
      const doc = m as Record<string, unknown>;
      const status = doc.status as string | undefined;
      const healthStatus = (doc.health as Record<string, unknown> | undefined)?.status as string | undefined;
      if (status === "CHECKING" || healthStatus === "CHECKING") {
        const last = (doc.lastCheckedAt as Date | null) || (doc.health as Record<string, unknown> | undefined)?.lastChecked as Date | null;
        if (last && Date.now() - new Date(last).getTime() < 60 * 1000) {
          return false; // still checking, skip
        }
      }
      return true;
    });

    let checked = 0;
    let failed = 0;
    let recovered = 0;
    let disabled = 0;

    // Bounded concurrency: 5 at a time
    const concurrency = 5;
    for (let i = 0; i < toCheck.length; i += concurrency) {
      const batch = toCheck.slice(i, i + concurrency);
      await Promise.allSettled(
        batch.map(async (method) => {
          const doc = method as unknown as Record<string, unknown> & {
            _id: unknown;
            name: string;
            slug: string;
            type: "manual" | "gateway";
            provider: string;
            accountNumber?: string;
            gatewayConfig?: Record<string, unknown>;
            enabled: boolean;
            status: string;
            health?: Record<string, unknown>;
          };
          const id = String(doc._id);
          const prevStatus = doc.status as string | undefined;
          const prevHealthStatus = (doc.health as Record<string, unknown> | undefined)?.status as string | undefined;
          const prevEnabled = !!doc.enabled;
          const prevFailures = ((doc.health as Record<string, unknown> | undefined)?.consecutiveFailures as number | undefined) ?? 0;

          // Set to CHECKING with version and requestId
          const requestId = new (await import("mongoose")).Types.ObjectId().toString();
          const checkVersion = ((doc.health as Record<string, unknown> | undefined)?.checkVersion as number | undefined ?? 0) + 1;
          const nowChecking = new Date();
          try {
            await PaymentMethod.findByIdAndUpdate(id, {
              $set: {
                status: "CHECKING",
                "health.status": "CHECKING",
                "health.lastChecked": nowChecking,
                lastCheckedAt: nowChecking,
                "health.requestId": requestId,
                "health.checkVersion": checkVersion,
              },
            });
          } catch {
            return;
          }

          // Perform real health check
          const result = await checkPaymentMethodHealth(
            {
              _id: id,
              name: doc.name,
              slug: doc.slug,
              type: doc.type as "manual" | "gateway",
              provider: doc.provider,
              accountNumber: doc.accountNumber as string | undefined,
              gatewayConfig: doc.gatewayConfig as Record<string, unknown> | undefined,
            },
            { timeoutMs: 5000, retry: true }
          );

          // Validate still current (stale protection)
          const fresh = (await PaymentMethod.findById(id).lean()) as unknown as Record<string, unknown> | null;
          if (!fresh) return;
          const freshHealth = (fresh.health as Record<string, unknown> | undefined);
          if (freshHealth?.requestId !== requestId || freshHealth?.checkVersion !== checkVersion) {
            // Stale, another check or credential update happened
            return;
          }

          const isHealthy = result.healthy;
          const now2 = new Date();
          const update: Record<string, unknown> = {
            "health.lastChecked": now2,
            lastCheckedAt: now2,
            "health.latencyMs": result.latencyMs,
            "health.requestId": null,
          };

          let newStatus: string;
          let newHealthStatus: string;
          let shouldDisable = false;
          let shouldNotifyRecovered = false;
          let shouldNotifyUnhealthy = false;

          if (isHealthy) {
            newStatus = "ACTIVE";
            newHealthStatus = "HEALTHY";
            (update as Record<string, unknown>)["health.lastSuccessAt"] = now2;
            (update as Record<string, unknown>)["health.error"] = null;
            (update as Record<string, unknown>)["health.errorCode"] = null;
            (update as Record<string, unknown>)["health.consecutiveFailures"] = 0;
            (update as Record<string, unknown>)["status"] = newStatus;
            (update as Record<string, unknown>)["health.status"] = newHealthStatus;
            // enabled remains as is (false stays false) - never auto-enable
            if (prevStatus === "FAILED" || prevHealthStatus === "UNHEALTHY") {
              shouldNotifyRecovered = true;
            }
          } else {
            newStatus = "FAILED";
            newHealthStatus = "UNHEALTHY";
            (update as Record<string, unknown>)["health.lastFailedAt"] = now2;
            (update as Record<string, unknown>)["health.error"] = result.error ? String(result.error).substring(0, 200) : "Health check failed";
            (update as Record<string, unknown>)["health.errorCode"] = result.errorCode || "UNKNOWN_ERROR";
            const nextFailures = prevFailures + 1;
            (update as Record<string, unknown>)["health.consecutiveFailures"] = nextFailures;
            (update as Record<string, unknown>)["status"] = newStatus;
            (update as Record<string, unknown>)["health.status"] = newHealthStatus;
            // Failure threshold: INVALID_CREDENTIALS immediate, else 2 consecutive
            const isInvalidCreds = result.errorCode === "INVALID_CREDENTIALS" || result.errorCode === "ACCOUNT_RESTRICTED";
            if (prevEnabled && (isInvalidCreds || nextFailures >= 2)) {
              (update as Record<string, unknown>)["enabled"] = false;
              shouldDisable = true;
            }
            if (prevHealthStatus !== "UNHEALTHY") {
              shouldNotifyUnhealthy = true;
            }
          }

          await PaymentMethod.findByIdAndUpdate(id, { $set: update });

          // Notifications with deduplication (5 min window)
          try {
            const NotificationModel = (await import("@/models/Notification")).default;
            if (isHealthy && shouldNotifyRecovered) {
              const recent = await NotificationModel.findOne({
                paymentMethodId: doc._id,
                title: "Payment gateway is healthy again",
                createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
              }).lean();
              if (!recent) {
                await notifyAdmins(
                  "Payment gateway is healthy again",
                  `${doc.name} (${doc.slug}) is healthy again (latency ${result.latencyMs ?? "?"}ms). You can now enable it.`,
                  "payment",
                  undefined,
                  String(doc._id)
                );
                recovered++;
              }
            } else if (!isHealthy && shouldNotifyUnhealthy) {
              const recent = await NotificationModel.findOne({
                paymentMethodId: doc._id,
                title: "Payment gateway became unhealthy",
                createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
              }).lean();
              if (!recent) {
                await notifyAdmins(
                  "Payment gateway became unhealthy",
                  `${doc.name} (${doc.slug}) is unhealthy: ${result.errorCode || "UNKNOWN_ERROR"}${result.error ? ` - ${String(result.error).substring(0, 80)}` : ""}.`,
                  "payment",
                  undefined,
                  String(doc._id)
                );
                failed++;
              }
              if (shouldDisable) {
                const recent2 = await NotificationModel.findOne({
                  paymentMethodId: doc._id,
                  title: "Payment gateway automatically disabled",
                  createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) },
                }).lean();
                if (!recent2) {
                  await notifyAdmins(
                    "Payment gateway automatically disabled",
                    `${doc.name} (${doc.slug}) was automatically disabled due to health failure (${result.errorCode || "UNKNOWN_ERROR"}).`,
                    "payment",
                    undefined,
                    String(doc._id)
                  );
                  disabled++;
                }
              }
            }
          } catch {}

          checked++;
        })
      );
    }

    return NextResponse.json({
      success: true,
      checked,
      failed,
      recovered,
      disabled,
      total: toCheck.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cron failed" }, { status: 500 });
  }
}
