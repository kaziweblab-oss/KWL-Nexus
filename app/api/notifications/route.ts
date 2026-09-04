import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ data: [] });
  try {
    await connectToDatabase();
    const email = session.user.email.toLowerCase();
    const rawId = (session.user as unknown as { id?: string })?.id;
    let items;
    if (rawId && mongoose.isValidObjectId(rawId)) {
      try {
        items = await Notification.find({ $or: [{ email }, { userId: new mongoose.Types.ObjectId(rawId) }] }).sort({ createdAt: -1 }).limit(50).lean();
      } catch {
        items = await Notification.find({ email }).sort({ createdAt: -1 }).limit(50).lean();
      }
    } else {
      items = await Notification.find({ email }).sort({ createdAt: -1 }).limit(50).lean();
    }
    return NextResponse.json({ data: items });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

export async function POST() {
  // admin can post notification directly — reuse admin route, keep this for system
  return NextResponse.json({ error: "Use admin route" }, { status: 405 });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    const email = session.user.email.toLowerCase();
    const rawId = (session.user as unknown as { id?: string })?.id;
    if (rawId && mongoose.isValidObjectId(rawId)) {
      try {
        await Notification.deleteMany({ $or: [{ email }, { userId: new mongoose.Types.ObjectId(rawId) }] });
      } catch {
        await Notification.deleteMany({ email });
      }
    } else {
      await Notification.deleteMany({ email });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
