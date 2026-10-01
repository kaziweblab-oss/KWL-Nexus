import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import Otp from "@/models/Otp";
import { getMemoryOtp, bumpMemoryOtpAttempts } from "@/lib/otp/memory";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  channel: z.enum(["email", "phone"]).optional(),
  code: z.string().min(4).max(10),
}).refine((d) => d.email || d.phone, { message: "Email or phone required" });

function normalizePhone(phone?: string) {
  if (!phone) return null;
  return phone.replace(/[^\d+]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Email/phone and code required" }, { status: 400 });

    const rawEmail = parsed.data.email?.toLowerCase().trim() ?? null;
    const rawPhone = normalizePhone(parsed.data.phone);
    let channel: "email" | "phone" = parsed.data.channel ?? (rawPhone ? "phone" : "email");
    if (channel === "phone" && !rawPhone) channel = "email";
    const target = channel === "phone" ? rawPhone! : rawEmail!;
    const code = parsed.data.code.trim();

    // Try DB first, fallback to memory. Failed attempts are counted so codes
    // cannot be brute-forced (limit 5 per code).
    try {
      await connectToDatabase();
      const targetQuery = channel === "phone" ? { phone: target } : { email: target };
      const record = await Otp.findOne(targetQuery).sort({ createdAt: -1 });
      if (record) {
        if (record.expiresAt < new Date()) {
          await Otp.deleteOne({ _id: record._id });
          return NextResponse.json({ error: "Code expired" }, { status: 400 });
        }
        if (record.attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
        if (record.code !== code) {
          await Otp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
          return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: "Code verified" }, { status: 200 });
      }
    } catch {
      // DB unavailable, check memory
    }

    const mem = getMemoryOtp(channel, target);
    if (!mem) return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    if (mem.code !== code) {
      const attempts = bumpMemoryOtpAttempts(channel, target);
      if (attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Code verified" }, { status: 200 });
  } catch (error) {
    console.error("OTP verify failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
