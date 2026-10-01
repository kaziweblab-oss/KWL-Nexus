/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Order from "@/models/Order";
import Payment from "@/models/Payment";
import Plan from "@/models/Plan";
import App from "@/models/App";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// User-facing order list: Order is the purchase record, enriched with plan, app
// and payment details so the UI never has to join collections client-side.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20));
  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean() as { _id: unknown } | null;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const [orders, total] = await Promise.all([
    Order.find({ userId: user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean() as Promise<any[]>,
    Order.countDocuments({ userId: user._id }),
  ]);
  // Batch enrichment (no N+1).
  const planIds = Array.from(new Set(orders.map((o) => String(o.planId ?? "")).filter(Boolean)));
  const paymentIds = Array.from(new Set(orders.map((o) => String(o.paymentId ?? "")).filter(Boolean)));
  const slugs = Array.from(new Set(orders.map((o) => String(o.appSlug ?? o.appId ?? "").toLowerCase()).filter(Boolean)));
  const [plans, payments, apps] = await Promise.all([
    planIds.length ? Plan.find({ _id: { $in: planIds } }).select("name appId appSlug").lean() as Promise<any[]> : [],
    paymentIds.length ? Payment.find({ _id: { $in: paymentIds } }).select("status paymentMethod transactionId").lean() as Promise<any[]> : [],
    slugs.length ? App.find({ slug: { $in: slugs } }).select("name slug").lean() as Promise<any[]> : [],
  ]);
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const payById = new Map(payments.map((p) => [String(p._id), p]));
  const appBySlug = new Map(apps.map((a) => [String(a.slug).toLowerCase(), a]));
  const data = orders.map((o) => {
    const plan = o.planId ? planById.get(String(o.planId)) : null;
    const payment = o.paymentId ? payById.get(String(o.paymentId)) : null;
    const slug = String(o.appSlug ?? o.appId ?? "").toLowerCase();
    const app = appBySlug.get(slug);
    return {
      _id: String(o._id),
      appSlug: o.appSlug ?? null,
      appId: o.appId ?? null,
      appName: app?.name ?? o.appSlug ?? o.appId ?? "Order",
      planName: plan?.name ?? null,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      paymentStatus: payment?.status ?? null,
      paymentMethod: payment?.paymentMethod ?? null,
      transactionId: payment?.transactionId ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  });
  return NextResponse.json({ data: { orders: data, page, limit, total } });
}

// Users may remove only their own UNPAID history (pending/created/failed/cancelled).
// Paid/fulfilled orders are financial records and can never be deleted by the user.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Valid order id required" }, { status: 400 });
  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean() as { _id: unknown } | null;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const order = await Order.findOne({ _id: id, userId: user._id });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!["pending", "created", "failed", "cancelled"].includes(order.status)) {
    return NextResponse.json({ error: "Only unpaid orders can be removed" }, { status: 403 });
  }
  await Order.deleteOne({ _id: order._id });
  return NextResponse.json({ data: { removed: true } });
}
