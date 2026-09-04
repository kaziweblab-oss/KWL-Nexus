import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import SystemConfig from "@/models/SystemConfig";

export const dynamic = "force-dynamic";

const defaultConfig = {
  brandName: "KWL-NEXUS",
  brandLogo: "",
  brandLogoLight: "",
  brandLogoDark: "",
  brandIcon: "",
  brandIconLight: "",
  brandIconDark: "",
  brandFavicon: "",
  brandBanner: "",
  brandBannerLight: "",
  brandBannerDark: "",
  brandAppIcon: "",
  ogImage: "",
  primaryColor: "#6C63FF",
  secondaryColor: "#00D4FF",
  accentColor: "#17172B",
  tutorialVideoUrl: "",
  tutorialVideoType: "youtube" as const,
  tutorialTitle: "How to use KWL Nexus Apps",
  tutorialDescription: "Watch this quick guide to learn how to browse, download and use our apps.",
  tutorialIsActive: true,
};

export async function GET() {
  try {
    await connectToDatabase();
    const config = await SystemConfig.findOne().lean();
    return NextResponse.json({ data: config ?? defaultConfig });
  } catch {
    return NextResponse.json({ data: defaultConfig });
  }
}
