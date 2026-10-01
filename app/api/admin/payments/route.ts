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

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  const User = (await import("@/models/User")).default;
  return User.findOne({ email: session.user.email });
}

// Admins can list requests and atomically activate a plan or reject a request.
export async function GET() {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const payments = await Payment.find().populate("userId", "name email").populate("subscriptionId").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: payments });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as { paymentId?: string; action?: "verify" | "reject"; deadline?: string; notes?: string };
  if (!body.paymentId || !body.action) return NextResponse.json({ error: "paymentId and action are required" }, { status: 400 });
  if (!mongoose.Types.ObjectId.isValid(body.paymentId)) return NextResponse.json({ error: "Invalid paymentId" }, { status: 400 });
  const payment = await Payment.findById(body.paymentId);
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  // Idempotency: re-verifying an already-succeeded payment must NOT create a
  // duplicate subscription. Rejecting a succeeded payment requires the refund flow.
  if (payment.status === "succeeded") {
    if (body.action === "verify") return NextResponse.json({ data: { id: payment.id, status: payment.status, subscriptionId: payment.subscriptionId } });
    return NextResponse.json({ error: "Payment already succeeded. Use refund instead of reject." }, { status: 409 });
  }
  if (body.action === "reject") {
    payment.status = "failed";
    payment.verifiedBy = admin._id;
    payment.verifiedAt = new Date();
    payment.notes = body.notes;
    await payment.save();
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
    return NextResponse.json({ data: { id: payment.id, status: payment.status } });
  }
  const plan = payment.planId ? await Plan.findById(payment.planId) : null;
  const startDate = new Date();
  const endDate = plan?.interval === "month" ? new Date(startDate.getTime()) : plan?.interval === "year" ? new Date(startDate.getTime()) : null;
  if (endDate && plan?.interval === "month") endDate.setMonth(endDate.getMonth() + 1);
  if (endDate && plan?.interval === "year") endDate.setFullYear(endDate.getFullYear() + 1);
  const subscription = await Subscription.create({ userId: payment.userId, planId: payment.planId, status: "active", startDate, endDate, startedAt: startDate, endsAt: endDate });
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
  return NextResponse.json({ data: { id: payment.id, status: payment.status, subscriptionId: subscription.id } });
}