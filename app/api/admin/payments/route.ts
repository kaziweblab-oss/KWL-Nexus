/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";
import Notification from "@/models/Notification";
import { logEvent } from "@/lib/observability/log";
import { recordAudit } from "@/lib/audit/record";
import { cappedLimit } from "@/lib/api/validate";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  const User = (await import("@/models/User")).default;
  return User.findOne({ email: session.user.email });
}

// Admins can list requests and atomically activate a plan or reject a request.
export async function GET(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const payments = await Payment.find().populate("userId", "name email").populate("subscriptionId").sort({ createdAt: -1 }).limit(cappedLimit(request)).lean() as Record<string, unknown>[];
  // Lifecycle visibility: join order + entitlement status per payment (batched, no N+1).
  try {
    const Order = (await import("@/models/Order")).default;
    const Entitlement = (await import("@/models/Entitlement")).default;
    const pids = payments.map((p) => p._id);
    const orders = (await Order.find({ paymentId: { $in: pids } }).select("paymentId status").lean()) as Array<{ _id: unknown; paymentId: unknown; status?: string }>;
    const orderByPay = new Map(orders.map((o) => [String(o.paymentId), o]));
    const subIds = payments.map((p) => p.subscriptionId).filter(Boolean);
    const ents = (await Entitlement.find({ $or: [{ orderId: { $in: orders.map((o) => o._id) } }, { subscriptionId: { $in: subIds } }] }).select("orderId subscriptionId status type").lean()) as Array<{ orderId?: unknown; subscriptionId?: unknown; status?: string }>;
    const entByOrder = new Map<string, { status?: string }>();
    const entBySub = new Map<string, { status?: string }>();
    for (const e of ents) {
      if (e.orderId && !entByOrder.has(String(e.orderId))) entByOrder.set(String(e.orderId), e);
      if (e.subscriptionId && !entBySub.has(String(e.subscriptionId))) entBySub.set(String(e.subscriptionId), e);
    }
    for (const p of payments) {
      const order = orderByPay.get(String(p._id));
      const ent = (order && entByOrder.get(String((order as { _id: unknown })._id))) || (p.subscriptionId ? entBySub.get(String(p.subscriptionId)) : undefined);
      (p as Record<string, unknown>).orderStatus = order?.status ?? null;
      (p as Record<string, unknown>).entitlementStatus = ent?.status ?? null;
    }
  } catch {}
  return NextResponse.json({ data: payments });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as { paymentId?: string; action?: "verify" | "reject" | "refund"; deadline?: string; notes?: string };
  if (!body.paymentId || !body.action) return NextResponse.json({ error: "paymentId and action are required" }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(body.paymentId)) return NextResponse.json({ error: "Invalid paymentId" }, { status: 400 });
  const payment = await Payment.findById(body.paymentId);
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  // Idempotency: re-verifying an already-succeeded payment must NOT create a
  // duplicate subscription. Rejecting a succeeded payment requires the refund flow.
  if (payment.status === "succeeded" && body.action !== "refund") {
    if (body.action === "verify") return NextResponse.json({ data: { id: payment.id, status: payment.status, subscriptionId: payment.subscriptionId } });
    return NextResponse.json({ error: "Payment already succeeded. Use refund instead of reject." }, { status: 409 });
  }
  if (body.action === "reject") {
    payment.status = "failed";
    payment.verifiedBy = admin._id;
    payment.verifiedAt = new Date();
    payment.notes = body.notes;
    await payment.save();
    // Keep the order lifecycle in sync (best-effort — payment row is authoritative).
    try {
      const Order = (await import("@/models/Order")).default;
      await Order.findOneAndUpdate({ paymentId: payment._id }, { $set: { status: "failed" } });
    } catch {}
    // notify user about rejection with reason
    try {
      const User = (await import("@/models/User")).default;
      const targetUser = await User.findById(payment.userId).select("email name").lean() as any;
      const email = (targetUser?.email || "").toLowerCase().trim();
      if (email || payment.userId) {
        await Notification.create({
          userId: payment.userId,
          email: email || undefined,
          title: "Payment rejected",
          message: `Your payment request${payment.transactionId ? ` (TXN: ${payment.transactionId})` : ""} for ${payment.appId || "your order"} was rejected.${body.notes ? ` Reason: ${body.notes}` : ""}`,
          type: "payment",
          appId: payment.appId,
        });
      }
    } catch {}
    logEvent("payment:verify", "payment rejected", { payment: String(payment._id) });
    await recordAudit("payment.rejected", (admin as { email?: string }).email ?? null, String(payment._id), { app: payment.appId ?? null });
    return NextResponse.json({ data: { id: payment.id, status: payment.status } });
  }
  if (body.action === "refund") {
    if (payment.status !== "succeeded") {
      return NextResponse.json({ error: "Only successful payments can be refunded" }, { status: 409 });
    }
    payment.status = "refunded";
    payment.verifiedBy = admin._id;
    payment.verifiedAt = new Date();
    payment.refundedAt = new Date();
    payment.notes = body.notes;
    await payment.save();
    // Cascade: subscription cancelled, entitlements revoked, order refunded.
    try {
      const Entitlement = (await import("@/models/Entitlement")).default;
      const Order = (await import("@/models/Order")).default;
      if (payment.subscriptionId) {
        await Subscription.findByIdAndUpdate(payment.subscriptionId, { $set: { status: "cancelled", endsAt: new Date(), endDate: new Date() } });
        await Entitlement.updateMany({ subscriptionId: payment.subscriptionId, status: "active" }, { $set: { status: "revoked" } });
      }
      const order = await Order.findOne({ paymentId: payment._id });
      if (order) {
        order.status = "refunded";
        await order.save();
        await Entitlement.updateMany({ orderId: order._id, status: "active" }, { $set: { status: "revoked" } });
      }
    } catch (cascadeErr) {
      console.warn("Refund cascade incomplete:", (cascadeErr as Error)?.message);
    }
    try {
      const User = (await import("@/models/User")).default;
      const targetUser = await User.findById(payment.userId).select("email").lean() as any;
      const email = (targetUser?.email || "").toLowerCase().trim();
      if (email || payment.userId) {
        await Notification.create({
          userId: payment.userId,
          email: email || undefined,
          title: "Payment refunded",
          message: `Your payment${payment.transactionId ? ` (TXN: ${payment.transactionId})` : ""} for ${payment.appId || "your order"} has been refunded.${body.notes ? ` Note: ${body.notes}` : ""}`,
          type: "payment",
          appId: payment.appId,
        });
      }
    } catch {}
    logEvent("payment:verify", "payment refunded", { payment: String(payment._id) });
    await recordAudit("payment.refunded", (admin as { email?: string }).email ?? null, String(payment._id), { app: payment.appId ?? null });
    return NextResponse.json({ data: { id: payment.id, status: payment.status } });
  }
  const plan = payment.planId ? await Plan.findById(payment.planId) : null;
  const startDate = new Date();
  const endDate = plan?.interval === "month" ? new Date(startDate.getTime()) : plan?.interval === "year" ? new Date(startDate.getTime()) : null;
  if (endDate && plan?.interval === "month") endDate.setMonth(endDate.getMonth() + 1);
  if (endDate && plan?.interval === "year") endDate.setFullYear(endDate.getFullYear() + 1);
  const subscription = await Subscription.create({ userId: payment.userId, planId: payment.planId, status: "active", startDate, endDate, startedAt: startDate, endsAt: endDate });
  // Order lifecycle: pending → paid → fulfilled. Backfill when the payment predates
  // Phase 2 (no order row yet).
  const Order = (await import("@/models/Order")).default;
  let order = await Order.findOne({ paymentId: payment._id });
  if (!order) {
    order = await Order.create({ userId: payment.userId, appId: payment.appId, planId: payment.planId, paymentId: payment._id, amount: payment.amount, currency: payment.currency, status: "paid" });
  } else if (order.status === "pending" || order.status === "created") {
    order.status = "paid";
    await order.save();
  }
  // Successful payment creates/updates the entitlement (access record). The legacy
  // subscription row above keeps old download checks working as a fallback.
  try {
    const { grantEntitlement } = await import("@/lib/entitlements/grants");
    await grantEntitlement({
      userId: payment.userId,
      plan: plan as { appSlug?: unknown; appId?: unknown; interval?: unknown } | null,
      planId: payment.planId,
      rawAppRef: payment.appId,
      orderId: order._id,
      subscriptionId: subscription._id,
      endsAt: (subscription as { endsAt?: Date; endDate?: Date }).endsAt ?? (subscription as { endDate?: Date }).endDate ?? null,
    });
    order.status = "fulfilled";
    await order.save();
  } catch (entErr) {
    console.warn("Entitlement grant failed (order stays paid, retry on re-verify):", (entErr as Error)?.message);
  }
  logEvent("payment:verify", "payment approved", { payment: String(payment._id) });
  await recordAudit("payment.approved", (admin as { email?: string }).email ?? null, String(payment._id), { app: payment.appId ?? null });
  payment.status = "succeeded";
  payment.subscriptionId = subscription._id;
  payment.verifiedBy = admin._id;
  payment.verifiedAt = new Date();
  payment.paidAt = new Date();
  payment.deadline = body.deadline ? new Date(body.deadline) : payment.deadline;
  payment.notes = body.notes;
  await payment.save();
  // notify user about approval
  try {
    const User = (await import("@/models/User")).default;
    const targetUser = await User.findById(payment.userId).select("email name").lean() as any;
    const email = (targetUser?.email || "").toLowerCase().trim();
    if (email || payment.userId) {
      await Notification.create({
        userId: payment.userId,
        email: email || undefined,
        title: "Payment approved",
        message: `Your payment request${payment.transactionId ? ` (TXN: ${payment.transactionId})` : ""} for ${payment.appId || "your order"} has been approved. Your subscription is now active.`,
        type: "payment",
        appId: payment.appId,
      });
    }
  } catch {}
  return NextResponse.json({ data: { id: payment.id, status: payment.status, subscriptionId: subscription.id, orderId: order?._id ? String(order._id) : null } });
}