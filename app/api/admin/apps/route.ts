import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import { isValidObjectId } from "mongoose";
import { cappedLimit } from "@/lib/api/validate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  await connectToDatabase();
  const apps = await App.find().sort({ createdAt: -1 }).limit(cappedLimit(request)).lean();
  return NextResponse.json({ data: apps });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || !isValidObjectId(id)) return NextResponse.json({ error: "Valid app id required" }, { status: 400 });
  await connectToDatabase();
  const app = await App.findByIdAndDelete(id);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: { id: app.id } });
}
