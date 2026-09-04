import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import SystemConfig from "@/models/SystemConfig";

export const dynamic = "force-dynamic";

const schema = z.object({
  brandName: z.string().trim().min(1).optional(),
  brandLogo: z.string().trim().optional(),
  brandLogoLight: z.string().trim().optional(),
  brandLogoDark: z.string().trim().optional(),
  brandIcon: z.string().trim().optional(),
  brandIconLight: z.string().trim().optional(),
  brandIconDark: z.string().trim().optional(),
  brandFavicon: z.string().trim().optional(),
  brandBanner: z.string().trim().optional(),
  brandBannerLight: z.string().trim().optional(),
  brandBannerDark: z.string().trim().optional(),
  brandAppIcon: z.string().trim().optional(),
  ogImage: z.string().trim().optional(),
  primaryColor: z.string().trim().min(1).optional(),
  secondaryColor: z.string().trim().min(1).optional(),
  accentColor: z.string().trim().min(1).optional(),
  tutorialVideoUrl: z.string().trim().optional(),
  tutorialVideoType: z.enum(["youtube", "vimeo", "custom"]).optional(),
  tutorialTitle: z.string().trim().optional(),
  tutorialDescription: z.string().trim().optional(),
  tutorialIsActive: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !(await isAdmin(session.user.email))) return null;
  await connectToDatabase();
  return true;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const config = await SystemConfig.findOne().lean();
  return NextResponse.json({ data: config ?? { brandName: "KWL-NEXUS", brandLogo: "", brandLogoLight: "", brandLogoDark: "", brandIcon: "", brandIconLight: "", brandIconDark: "", brandFavicon: "", brandBanner: "", brandBannerLight: "", brandBannerDark: "", brandAppIcon: "", ogImage: "", primaryColor: "#6C63FF", secondaryColor: "#00D4FF", accentColor: "#17172B", tutorialVideoUrl: "", tutorialVideoType: "youtube", tutorialTitle: "How to use KWL Nexus Apps", tutorialDescription: "Watch this quick guide to learn how to browse, download and use our apps.", tutorialIsActive: true } });
}

export async function PUT(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const config = await SystemConfig.findOneAndUpdate({}, { $set: parsed.data }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  return NextResponse.json({ data: config });
}
