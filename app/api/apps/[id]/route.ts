import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";
import mongoose from "mongoose";

// Return one published app by MongoDB id or slug.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const or: Record<string, unknown>[] = [{ slug: params.id }];
  if (mongoose.Types.ObjectId.isValid(params.id)) or.push({ _id: params.id });
  const app = await App.findOne({ isPublished: true, $or: or }).lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}
