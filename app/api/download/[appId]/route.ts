/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";
import App from "@/models/App";
import User from "@/models/User";
import { API_ERRORS } from "@/lib/api/errors";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: API_ERRORS.USER_NOT_LOGGED_IN }, { status: 401 });
    }

    const { appId } = params;
    const platform = req.nextUrl.searchParams.get("platform") || "android";

    if (!["android", "windows", "linux"].includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    await connectToDatabase();

    // Get user
    const user = await User.findOne({ email: session.user.email }).lean();
    if (!user) {
      return NextResponse.json({ error: API_ERRORS.USER_NOT_LOGGED_IN }, { status: 401 });
    }

    // Get app - support both ObjectId and slug, fallback to dummy catalog
    let app: any = null;
    if (mongoose.Types.ObjectId.isValid(appId)) {
      app = await App.findById(appId).lean();
    }
    if (!app) {
      app = await App.findOne({ slug: appId }).lean();
    }
    // Fallback to dummy catalog for demo apps (e.g., focus-flow) — only in non-production to avoid mock leak
    if (!app && process.env.NODE_ENV !== "production") {
      try {
        const { getApp } = await import("@/lib/data/apps");
        const dummy = getApp(appId);
        if (dummy) {
          app = {
            _id: dummy.id,
            name: dummy.name,
            slug: dummy.id,
            latestVersion: dummy.versions?.[0]?.version ?? "1.0.0",
            // Provide mock download URLs when DB app is missing
            downloadUrl: {
              android: `https://cdn.kwl-nexus.example.com/${dummy.id}/latest/android.apk`,
              windows: `https://cdn.kwl-nexus.example.com/${dummy.id}/latest/windows.exe`,
              linux: `https://cdn.kwl-nexus.example.com/${dummy.id}/latest/linux.deb`,
            },
          };
        }
      } catch {
        // ignore dummy fallback error
      }
    }
    if (!app) {
      return NextResponse.json({ error: API_ERRORS.APP_NOT_FOUND }, { status: 404 });
    }

    // Check subscription - allow active subscription check with ObjectId or string
    const appObjectId = mongoose.Types.ObjectId.isValid(app._id) ? app._id : undefined;
    const subscriptionQuery: any = {
      userId: user._id,
      status: "active",
      endDate: { $gt: new Date() },
    };
    // Try multiple appId formats to cover slug vs ObjectId inconsistency
    const orConditions: any[] = [];
    if (appObjectId) orConditions.push({ appId: appObjectId });
    orConditions.push({ appId: appId });
    orConditions.push({ appId: app._id });
    if (app.slug) orConditions.push({ appId: app.slug });

    // If subscription collection is empty for dummy apps in dev, allow access when user is logged in
    // but still attempt to find real subscription first
    let subscription: any = null;
    if (orConditions.length === 1) {
      subscription = await Subscription.findOne({ ...subscriptionQuery, ...orConditions[0] }).lean();
    } else {
      subscription = await Subscription.findOne({ ...subscriptionQuery, $or: orConditions }).lean();
    }

    // In production, require subscription. For dummy catalog without DB records, if no subscription found
    // we still check if any subscription exists for user; if none, return error
    if (!subscription) {
      const isDummy = !mongoose.Types.ObjectId.isValid(String(app._id));
      if (!isDummy) {
        return NextResponse.json(
          { error: API_ERRORS.SUBSCRIPTION_EXPIRED },
          { status: 403 }
        );
      }
      // For dummy apps, only allow virtual bypass in non-production
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: API_ERRORS.SUBSCRIPTION_EXPIRED },
          { status: 403 }
        );
      }
      // For dummy apps in dev, create a virtual subscription pass for logged-in user
      subscription = { status: "active", endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
    }

    // Get download URL based on platform - handle multiple field name variants and fallback
    const rawApp: any = app;
    const downloadUrls: Record<string, string | undefined> = {
      android: rawApp.downloadUrl?.android || rawApp.downloadUrl?.apk || rawApp.downloadUrl?.Android,
      windows: rawApp.downloadUrl?.windows || rawApp.downloadUrl?.exe || rawApp.downloadUrl?.Windows,
      linux: rawApp.downloadUrl?.linux || rawApp.downloadUrl?.deb || rawApp.downloadUrl?.Linux,
    };

    const downloadUrl = downloadUrls[platform];

    if (!downloadUrl) {
      return NextResponse.json(
        { error: API_ERRORS.DOWNLOAD_URL_NOT_FOUND },
        { status: 404 }
      );
    }

    // Increment downloadCount for popular ranking (only for real DB apps)
    try {
      if (mongoose.Types.ObjectId.isValid(String(app._id))) {
        await App.findByIdAndUpdate(app._id, { $inc: { downloadCount: 1 } }).exec();
      } else if (app.slug) {
        await App.findOneAndUpdate({ slug: app.slug }, { $inc: { downloadCount: 1 } }).exec();
      }
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
      appName: app.name,
      platform,
      version: app.latestVersion,
    });
  } catch (error) {
    console.error("Download request error:", error);
    return NextResponse.json(
      { error: API_ERRORS.DATABASE_CONNECTION_FAILED },
      { status: 500 }
    );
  }
}
