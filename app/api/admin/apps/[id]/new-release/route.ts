import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const jwt = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof jwt?.email === "string" ? jwt.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as { isNewRelease?: boolean; newReleaseImageUrl?: string | null; newReleaseOrder?: number };
  if (body.newReleaseImageUrl && body.newReleaseImageUrl.length > 1_200_000) return NextResponse.json({ error: "Image too large (max ~1MB)" }, { status: 400 });
  await connectToDatabase();
  const app = await App.findByIdAndUpdate(params.id, {
    ...(typeof body.isNewRelease === "boolean" ? { isNewRelease: body.isNewRelease } : {}),
    ...(body.newReleaseImageUrl !== undefined ? { newReleaseImageUrl: body.newReleaseImageUrl || undefined } : {}),
    ...(typeof body.newReleaseOrder === "number" ? { newReleaseOrder: body.newReleaseOrder } : {}),
  }, { new: true });
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  // reuse PATCH auth check via GET for editor preload
  const token = await getToken({ req: _ as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === "string" ? token.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  await connectToDatabase();
  const app = await App.findById(params.id).lean();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  return NextResponse.json({ data: app });
}
