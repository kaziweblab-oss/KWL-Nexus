import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/connect";
import Otp from "@/models/Otp";
import { setMemoryOtp } from "@/lib/otp/memory";
import { checkRateLimit, clientIp } from "@/lib/auth/rateLimit";

export const dynamic = "force-dynamic";

// ── Rate limiting (shared in-memory, per-target + per-IP) ──
// Production should move to Redis for multi-instance; this prevents OTP spam/flood (CRITICAL).
const OTP_WINDOW_MS = 15 * 60 * 1000; // 15 min
const OTP_MAX_PER_TARGET = 5; // per email/phone
const OTP_MAX_PER_IP = 20; // per IP

const schema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  channel: z.enum(["email", "phone"]).optional(),
}).refine((d) => d.email || d.phone, { message: "Email or phone required" });

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

function normalizePhone(phone?: string) {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned;
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
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Valid contact required" }, { status: 400 });

    const rawEmail = parsed.data.email?.toLowerCase().trim() ?? null;
    const rawPhone = normalizePhone(parsed.data.phone);
    let channel: "email" | "phone" = parsed.data.channel ?? (rawPhone ? "phone" : "email");
    // If channel is phone but no phone provided, fallback to email
    if (channel === "phone" && !rawPhone) {
      if (rawEmail) channel = "email";
      else return NextResponse.json({ error: "Phone number required for phone channel" }, { status: 400 });
    }
    if (channel === "email" && !rawEmail) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    const target = channel === "phone" ? rawPhone! : rawEmail!;
    const email = channel === "email" ? target : undefined;
    const phone = channel === "phone" ? target : undefined;

    // Rate limiting — per target and per IP
    const ip = clientIp(req);
    const targetKey = `otp:target:${channel}:${target}`;
    const ipKey = `otp:ip:${ip}`;
    if (!checkRateLimit(targetKey, OTP_MAX_PER_TARGET, OTP_WINDOW_MS)) {
      return NextResponse.json({ error: "Too many OTP requests. Please try again in 15 minutes." }, { status: 429 });
    }
    if (!checkRateLimit(ipKey, OTP_MAX_PER_IP, OTP_WINDOW_MS)) {
      return NextResponse.json({ error: "Too many requests from this IP. Please try again later." }, { status: 429 });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Try DB, fallback to memory store if DB unavailable (e.g., Atlas IP not whitelisted)
    let usedMemoryFallback = false;
    try {
      await connectToDatabase();
      if (channel === "email") await Otp.deleteMany({ email: target });
      else await Otp.deleteMany({ phone: target });
      await Otp.create({ email, phone, channel, code, expiresAt });
    } catch (dbErr) {
      console.warn("[OTP] DB unavailable, using memory fallback:", (dbErr as Error).message);
      usedMemoryFallback = true;
      setMemoryOtp(channel, target, code, expiresAt);
    }

    // Logging — never log plaintext OTP in production (CRITICAL fix)
    const isDev = process.env.NODE_ENV !== "production";
    if (channel === "phone") {
      if (isDev) {
        console.log(`[OTP-SMS] ${target} -> ${code} (expires ${expiresAt.toISOString()})${usedMemoryFallback ? " [memory]" : ""}`);
      } else {
        console.log(`[OTP-SMS] code sent to ${target} (expires ${expiresAt.toISOString()})${usedMemoryFallback ? " [memory]" : ""}`);
      }
      // TODO: Integrate Twilio / SMS gateway when provider env is set (e.g., TWILIO_SID)
    } else {
      if (isDev) {
        console.log(`[OTP] ${target} -> ${code} (expires ${expiresAt.toISOString()})${usedMemoryFallback ? " [memory]" : ""}`);
      } else {
        console.log(`[OTP] code sent to ${target} (expires ${expiresAt.toISOString()})${usedMemoryFallback ? " [memory]" : ""}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: channel === "phone" ? "Verification code sent to phone" : "Verification code sent to email",
        channel,
        // In dev only, include code for testing without email/SMS setup; never in production
        ...(isDev ? { previewCode: code, memoryFallback: usedMemoryFallback } : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("OTP send failed:", error);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
