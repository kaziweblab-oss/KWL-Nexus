import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import Plan from "@/models/Plan";

// Plans are scoped to an app so clients can render checkout choices safely.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  await connectToDatabase();
  const plans = await Plan.find({ $or: [{ appId: params.id }, { appSlug: params.id }], isActive: true }).sort({ price: 1 }).lean();
  return NextResponse.json({ data: plans });
}
