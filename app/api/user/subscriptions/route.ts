import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api/auth";
import { connectToDatabase } from "@/lib/db/connect";
import Subscription from "@/models/Subscription";

// Return the authenticated user's subscription history with its plan details.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await connectToDatabase();
  const subscriptions = await Subscription.find({ userId: auth.userId }).populate("planId", "name price interval").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: subscriptions });
}
