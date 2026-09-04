import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Payment from "@/models/Payment";

// Allow owner to delete their own payment request / order
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const payment = await Payment.findOne({ _id: params.id, userId: auth.userId });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  await Payment.deleteOne({ _id: params.id, userId: auth.userId });
  return NextResponse.json({ success: true });
}
