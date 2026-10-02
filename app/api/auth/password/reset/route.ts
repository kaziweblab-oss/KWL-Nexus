import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { getMemoryOtp, bumpMemoryOtpAttempts, deleteMemoryOtp } from "@/lib/otp/memory";
import { verifyOtpCode } from "@/lib/otp/hash";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  channel: z.enum(["email", "phone"]).optional(),
  code: z.string().min(4).max(10),
  newPassword: z.string().min(6, "Password min 6").max(100),
}).refine((d) => d.email || d.phone, { message: "Email or phone required" });

function normalizePhone(p?: string | null) {
  if (!p) return null;
  return p.replace(/[^\d+]/g, "");
}

// OTP-verified password reset. The OTP is single-use: it is consumed here so a
// leaked code cannot be replayed for a second reset.
export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = JSON.parse((await req.text()) || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

    const rawEmail = parsed.data.email?.toLowerCase().trim() ?? null;
    const rawPhone = normalizePhone(parsed.data.phone);
    let channel: "email" | "phone" = parsed.data.channel ?? (rawPhone ? "phone" : "email");
    if (channel === "phone" && !rawPhone) channel = "email";
    if (channel === "email" && !rawEmail) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    const target = (channel === "phone" ? rawPhone : rawEmail) as string;
    const code = parsed.data.code.trim();
    const newPassword = parsed.data.newPassword;
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return NextResponse.json({ error: "Password must include a letter and a number" }, { status: 400 });
    }

    const ip = clientIp(req);
    if (!checkRateLimit(`pwreset:ip:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    if (!checkRateLimit(`pwreset:target:${channel}:${target}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    await connectToDatabase();
    // Verify OTP (latest for target; count failures; consume on success).
    const targetQuery = channel === "phone" ? { phone: target } : { email: target };
    const rec = await Otp.findOne(targetQuery).sort({ createdAt: -1 });
    if (!rec) {
      const mem = getMemoryOtp(channel, target);
      if (!mem || !verifyOtpCode(code, mem.codeHash)) {
        if (mem) bumpMemoryOtpAttempts(channel, target);
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      }
      deleteMemoryOtp(channel, target);
    } else {
      if (rec.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: rec._id });
        return NextResponse.json({ error: "Code expired" }, { status: 400 });
      }
      if (rec.attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
      if (!verifyOtpCode(code, rec.code)) {
        await Otp.updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
        return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
      }
      await Otp.deleteOne({ _id: rec._id });
    }

    const user = channel === "phone" ? await User.findOne({ phone: target }) : await User.findOne({ email: target });
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return NextResponse.json({ success: true, message: "Password updated. Please login with your new password." });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
