import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import ContactConfig from "@/models/ContactConfig";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

const PHONE_TYPES = ["phone", "whatsapp"] as const;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactSchema = z
  .object({
    type: z.enum(["email", "phone", "whatsapp", "facebook", "twitter", "instagram", "youtube", "telegram", "github", "custom"]).optional(),
    value: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1).optional(),
    icon: z.string().trim().min(1).optional(),
    section: z.enum(["getInTouch", "social"]).optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate value when type and value are both present (creation/update with type change)
    // For partial updates (e.g. toggle isActive) skip.
    if (data.value !== undefined && data.type !== undefined) {
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
    } else if (data.value !== undefined && data.type === undefined) {
      // value alone without type: if it looks like email, validate email format is not forced; skip
    }
  });

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return true;
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Extra validation when value is updated without type: infer type from existing doc
  if (parsed.data.value !== undefined && parsed.data.type === undefined) {
    const existing = await ContactConfig.findById(params.id).lean();
    const inferredType = existing?.type as string | undefined;
    if (inferredType === "email" && !emailRegex.test(parsed.data.value)) {
      return NextResponse.json({ error: { fieldErrors: { value: ["Please enter a valid email address"] } } }, { status: 400 });
    }
    if (inferredType && (PHONE_TYPES as readonly string[]).includes(inferredType)) {
      const v = parsed.data.value.trim();
      if (!v.startsWith("+")) return NextResponse.json({ error: { fieldErrors: { value: ["Phone must include country code, e.g. +8801310050878"] } } }, { status: 400 });
      try {
        if (!isValidPhoneNumber(v)) return NextResponse.json({ error: { fieldErrors: { value: ["Invalid phone number"] } } }, { status: 400 });
      } catch {
        return NextResponse.json({ error: { fieldErrors: { value: ["Invalid phone number"] } } }, { status: 400 });
      }
    }
  }

  // Duplicate type/value prevention (excluding self)
  if (parsed.data.type !== undefined && parsed.data.type !== "custom") {
    const dupType = await ContactConfig.findOne({ type: parsed.data.type, _id: { $ne: params.id } }).lean();
    if (dupType) return NextResponse.json({ error: { fieldErrors: { value: [`Type "${parsed.data.type}" already exists`] } } }, { status: 400 });
  }
  if (parsed.data.value !== undefined) {
    const dupVal = await ContactConfig.findOne({ value: { $regex: `^${escapeRegex(parsed.data.value.trim())}$`, $options: "i" }, _id: { $ne: params.id } }).lean();
    if (dupVal) return NextResponse.json({ error: { fieldErrors: { value: ["This value already exists"] } } }, { status: 400 });
  }

  // Order shift: make space at new order, push existing >= new order to next
  if (parsed.data.order !== undefined) {
    const existingDoc = await ContactConfig.findById(params.id).lean();
    if (existingDoc && parsed.data.order !== existingDoc.order) {
      const newOrder = parsed.data.order;
      await ContactConfig.updateMany({ _id: { $ne: params.id }, order: { $gte: newOrder } }, { $inc: { order: 1 } });
    }
  }

  const contact = await ContactConfig.findByIdAndUpdate(params.id, { $set: parsed.data }, { new: true });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ data: contact });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const contact = await ContactConfig.findByIdAndDelete(params.id);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ data: { deleted: true } });
}
