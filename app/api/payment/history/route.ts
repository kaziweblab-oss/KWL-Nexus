import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";

// Return payment requests owned by the authenticated user.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const history = await Payment.find({ userId: auth.userId }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: history });
}

export async function DELETE(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  await Payment.deleteMany({ userId: auth.userId });
  return NextResponse.json({ success: true });
}