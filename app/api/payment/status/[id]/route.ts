import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";

// Only the payment owner can inspect payment status.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const payment = await Payment.findOne({ _id: params.id, userId: auth.userId }).lean();
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  return NextResponse.json({ data: payment });
}
