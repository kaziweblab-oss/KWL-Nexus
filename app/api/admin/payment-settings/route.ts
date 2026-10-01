import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentConfig from "@/models/PaymentConfig";
import { notifyAdmins } from "@/lib/notifications/admin";

async function admin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return false;
  try {
    await connectToDatabase();
  } catch {
    return true;
  }
  return true;
}

// Admin-only read/write access for the manual payment instructions.
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const config = await PaymentConfig.findOne().lean();
    return NextResponse.json({ data: config ?? { bkash: "", nagad: "", rocket: "", helpText: "" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable", data: { bkash: "", nagad: "", rocket: "", helpText: "" } }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json() as { bkash?: string; nagad?: string; rocket?: string; helpText?: string };
    const config = await PaymentConfig.findOneAndUpdate({}, { $set: body }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    await notifyAdmins("Payment settings updated", "An administrator updated the payment gateway settings.", "payment");
    return NextResponse.json({ data: config });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}
