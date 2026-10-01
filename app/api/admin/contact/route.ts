import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import ContactConfig from "@/models/ContactConfig";

export const dynamic = "force-dynamic";

const PHONE_TYPES = ["phone", "whatsapp"] as const;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactSchema = z
  .object({
    type: z.enum(["email", "phone", "whatsapp", "facebook", "twitter", "instagram", "youtube", "telegram", "github", "custom"]),
    value: z.string().trim().min(1),
    label: z.string().trim().min(1),
    icon: z.string().trim().min(1),
    section: z.enum(["getInTouch", "social"]).optional().default("getInTouch"),
    isActive: z.boolean().default(true),
    order: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    if (data.type === "email" && !emailRegex.test(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Please enter a valid email address" });
    }
    if ((PHONE_TYPES as readonly string[]).includes(data.type)) {
      const v = data.value.trim();
      if (!v.startsWith("+")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Phone must include country code, e.g. +8801310050878" });
        return;
      }
      try {
        if (!isValidPhoneNumber(v)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Invalid phone number for the selected country code" });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Invalid phone number" });
      }
    }
  });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return session.user.email;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const contacts = await ContactConfig.find().sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json({ data: contacts });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Duplicate type/value prevention — each type (except custom) only once, value unique
  if (parsed.data.type !== "custom") {
    const dupType = await ContactConfig.findOne({ type: parsed.data.type }).lean();
    if (dupType) return NextResponse.json({ error: { fieldErrors: { value: [`Type "${parsed.data.type}" already exists`] } } }, { status: 400 });
  }
  const dupVal = await ContactConfig.findOne({ value: { $regex: `^${escapeRegex(parsed.data.value.trim())}$`, $options: "i" } }).lean();
  if (dupVal) return NextResponse.json({ error: { fieldErrors: { value: ["This value already exists"] } } }, { status: 400 });

  // Order shift: if desired order already taken, push existing >= desired to next order
  const desiredOrder = parsed.data.order ?? 0;
  await ContactConfig.updateMany({ order: { $gte: desiredOrder } }, { $inc: { order: 1 } });

  const contact = await ContactConfig.create({ ...parsed.data, order: desiredOrder });
  return NextResponse.json({ data: contact }, { status: 201 });
}
