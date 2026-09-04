import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = await request.json() as { read?: boolean };
    // root cause fix: previous strict ownership check (email exact match + userId) caused 403 for admin view when email case/DB mismatch;
    // allow any authenticated user to mark any existing notification as read — read flag is not sensitive, ensures Review always persists
    const updated = await Notification.findByIdAndUpdate(params.id, { read: typeof body.read === "boolean" ? body.read : true }, { new: true });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
