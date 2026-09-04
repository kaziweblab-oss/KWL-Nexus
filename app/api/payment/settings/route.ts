import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentConfig from "@/models/PaymentConfig";

export const dynamic = "force-dynamic";

// Default values ensure client always receives valid JSON even when DB is unavailable
const DEFAULT_CONFIG = { bkash: "", nagad: "", rocket: "", helpText: "Send the exact amount and keep your transaction ID." };

// Payment numbers are intentionally public because customers need them to pay manually.
export async function GET() {
  try {
    await connectToDatabase();
    const config = await PaymentConfig.findOne().select("bkash nagad rocket helpText").lean();
    return NextResponse.json({ data: config ?? DEFAULT_CONFIG });
  } catch (error) {
    console.error("Payment settings fetch failed:", error);
    // Always return JSON with 200 to prevent 'Unexpected end of JSON input' on client
    return NextResponse.json({ data: DEFAULT_CONFIG, fallback: true }, { status: 200 });
  }
}