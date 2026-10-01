import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connect";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { getMemoryOtp, bumpMemoryOtpAttempts } from "@/lib/otp/memory";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2, "Name required").max(50),
  email: z.string().email(),
  phone: z.string().min(6, "Phone required").max(20),
  password: z.string().min(6, "Password min 6").max(100),
  code: z.string().min(4).max(10),
  channel: z.enum(["email", "phone"]).default("email"),
});

function normalizePhone(p: string) {
  return p.replace(/[^\d+]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = JSON.parse(await req.text() || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, email: rawEmail, phone: rawPhone, password, code, channel } = parsed.data;
    const email = rawEmail.toLowerCase().trim();
    const phone = normalizePhone(rawPhone);
    const target = channel === "phone" ? phone : email;

    // Verify OTP (DB + memory fallback) — keep OTP for auto-login, don't delete here (signIn will consume)
    let otpValid = false;
    let usedMemory = false;
    try {
      await connectToDatabase();
      const targetQuery = channel === "phone" ? { phone: target } : { email: target };
      const rec = await Otp.findOne(targetQuery).sort({ createdAt: -1 });
      if (rec) {
        if (rec.expiresAt < new Date()) {
          await Otp.deleteOne({ _id: rec._id });
          return NextResponse.json({ error: "Code expired" }, { status: 400 });
        }
        if (rec.attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
        if (rec.code !== code) {
          await Otp.updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
          return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
        }
        otpValid = true;
        // Do NOT delete here — keep for auto sign-in (signIn will consume)
      }
    } catch {
      // DB unavailable handled below
    }
    if (!otpValid) {
      const mem = getMemoryOtp(channel, target);
      if (mem && mem.code === code) {
        otpValid = true;
        usedMemory = true;
        // Keep memory OTP for auto sign-in as well
      } else if (mem) {
        const attempts = bumpMemoryOtpAttempts(channel, target);
        if (attempts >= 5) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
      }
    }
    if (!otpValid) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

    // Check existing user
    await connectToDatabase().catch(() => null);
    try {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return NextResponse.json({ error: "Phone already registered" }, { status: 409 });
    } catch {
      // if DB unavailable, allow memory-only creation? but we still try to create below and will fail if DB down
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      await connectToDatabase();
      const user = await User.create({ name: name.trim(), email, phone, passwordHash, role: "user" });
      console.log(`[REGISTER] ${email} / ${phone} -> ${user._id}${usedMemory ? " [memory otp]" : ""}`);
      return NextResponse.json({ success: true, message: "Account created, please login" }, { status: 201 });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("whitelist") || msg.includes("connect")) {
        return NextResponse.json({ error: "Database unavailable (Atlas IP not whitelisted). Add 0.0.0.0/0 in Atlas Network Access." }, { status: 500 });
      }
      throw e;
    }
  } catch (error) {
    console.error("Register failed:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
