/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Plan from "@/models/Plan";
import PaymentMethod from "@/models/PaymentMethod";
import PaymentConfig from "@/models/PaymentConfig";
import Notification from "@/models/Notification";
import { API_ERRORS } from "@/lib/api/errors";
import { notifyAdmins } from "@/lib/notifications/admin";

export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  appId: z.string().min(1, "App ID is required"),
  // extensible: any slug from PaymentMethod collection (bkash/nagad/rocket/stripe/...)
  paymentMethod: z.string().min(1, "Payment method is required"),
  transactionId: z.string().min(1, "Transaction ID is required"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: API_ERRORS.USER_NOT_LOGGED_IN }, { status: 401 });
    }

    const body = await req.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payment details", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: API_ERRORS.USER_NOT_LOGGED_IN }, { status: 401 });
    }

    // Validate payment method is active and healthy (safe activation)
    const pm = await PaymentMethod.findOne({
      slug: parsed.data.paymentMethod.toLowerCase(),
      enabled: true,
      status: "ACTIVE",
      "health.status": "HEALTHY",
      isDeleted: false,
    }).lean();
    if (!pm) {
      // Fallback: check legacy PaymentConfig for manual bKash/Nagad/Rocket if no PaymentMethod found
      const cfg = await PaymentConfig.findOne().lean() as Record<string, unknown> | null;
      const legacyOk =
        (parsed.data.paymentMethod.toLowerCase() === "bkash" && !!(cfg as Record<string, unknown> | null)?.bkash) ||
        (parsed.data.paymentMethod.toLowerCase() === "nagad" && !!(cfg as Record<string, unknown> | null)?.nagad) ||
        (parsed.data.paymentMethod.toLowerCase() === "rocket" && !!(cfg as Record<string, unknown> | null)?.rocket);
      if (!legacyOk) {
        return NextResponse.json({ error: "Payment method not available. Please select an active payment method." }, { status: 400 });
      }
    }

    // Resolve plan - support ObjectId, slug/name, and dummy catalog fallback
    let plan: any = null;
    if (mongoose.Types.ObjectId.isValid(parsed.data.planId)) {
      plan = await Plan.findById(parsed.data.planId).lean();
    }
    if (!plan) {
      plan = await Plan.findOne({ slug: parsed.data.planId }).lean();
    }
    if (!plan) {
      plan = await Plan.findOne({ name: parsed.data.planId }).lean();
    }
    // Fallback to dummy catalog when DB plan not found — only in non-production to avoid mock price in deployed app
    if (!plan && process.env.NODE_ENV !== "production") {
      try {
        const { getApp } = await import("@/lib/data/apps");
        const dummyApp = getApp(parsed.data.appId);
        const dummyPlan = dummyApp?.plans.find((p) => p.name === decodeURIComponent(parsed.data.planId));
        if (dummyPlan) {
          const numericPrice = Number(dummyPlan.price.replace(/[^0-9.]/g, "")) || 0;
          plan = {
            _id: new mongoose.Types.ObjectId(),
            price: numericPrice,
            currency: "BDT",
            name: dummyPlan.name,
          };
        }
      } catch {
        // ignore
      }
    }
    if (!plan) {
      return NextResponse.json({ error: API_ERRORS.PLAN_NOT_FOUND }, { status: 404 });
    }

    const resolvedPlanId = plan._id;
    // Normalize TrxID (defense in depth — client already formats per method).
    const transactionId = parsed.data.transactionId.trim().toUpperCase().replace(/\s+/g, "");
    const payment = new Payment({
      userId: user._id,
      planId: resolvedPlanId,
      appId: parsed.data.appId,
      amount: plan.price,
      currency: plan.currency || "BDT",
      status: "pending",
      paymentMethod: parsed.data.paymentMethod,
      transactionId,
      notes: parsed.data.notes,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await payment.save();
    await notifyAdmins(
      "New payment request",
      `${user.email} submitted a ${parsed.data.paymentMethod} payment request for ${plan.name} (${parsed.data.appId}). Transaction ID: ${transactionId}.`,
      "payment",
    );
    // notify user — order successfully submitted
    try {
      await Notification.create({
        userId: user._id,
        email: user.email.toLowerCase().trim(),
        title: "Order submitted successfully",
        message: `Your payment request for ${plan.name} (${parsed.data.appId}) has been submitted successfully. Transaction ID: ${transactionId}. We will verify and activate within 24 hours.`,
        type: "payment",
        appId: parsed.data.appId,
        appName: plan.name,
      });
    } catch {}

    return NextResponse.json(
      {
        success: true,
        message: "Payment request created successfully",
        paymentId: payment._id,
        appId: parsed.data.appId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: API_ERRORS.DATABASE_CONNECTION_FAILED },
      { status: 500 }
    );
  }
}
