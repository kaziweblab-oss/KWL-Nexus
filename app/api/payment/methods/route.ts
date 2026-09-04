import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import PaymentMethod from "@/models/PaymentMethod";
import PaymentConfig from "@/models/PaymentConfig";

export const dynamic = "force-dynamic";

// Public list of enabled payment methods. Only ACTIVE+HEALTHY are exposed, secrets never returned.
export async function GET() {
  try {
    await connectToDatabase();
    const methods = await PaymentMethod.find({ enabled: true, status: "ACTIVE", "health.status": "HEALTHY", isDeleted: false }).sort({ order: 1, createdAt: 1 }).select("name slug type provider accountNumber instructions qrImageUrl enabled order icon status health").lean();
    if (methods.length) {
      const res = NextResponse.json({ data: methods });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
    // Fallback to legacy config -> synthesize manual methods
    const cfg = await PaymentConfig.findOne().lean() as { bkash?: string; nagad?: string; rocket?: string; helpText?: string } | null;
    type FallbackMethod = { name: string; slug: string; type: string; provider: string; accountNumber: string; instructions: string; enabled: boolean; order: number; icon: string };
    const fallback: FallbackMethod[] = [];
    if (cfg?.bkash) fallback.push({ name: "bKash", slug: "bkash", type: "manual", provider: "bkash", accountNumber: cfg.bkash, instructions: cfg.helpText ?? "", enabled: true, order: 0, icon: "" });
    if (cfg?.nagad) fallback.push({ name: "Nagad", slug: "nagad", type: "manual", provider: "nagad", accountNumber: cfg.nagad, instructions: cfg.helpText ?? "", enabled: true, order: 1, icon: "" });
    if (cfg?.rocket) fallback.push({ name: "Rocket", slug: "rocket", type: "manual", provider: "rocket", accountNumber: cfg.rocket, instructions: cfg.helpText ?? "", enabled: true, order: 2, icon: "" });
    if (fallback.length) return NextResponse.json({ data: fallback, fallback: true });
    // default empty set with demo placeholders disabled? return empty
    return NextResponse.json({ data: [] });
  } catch (error) {
    console.error("payment/methods fetch failed", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
