import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import PricingTier from "@/models/PricingTier";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectToDatabase();
  const tiers = await PricingTier.find({ isActive: true }).sort({ order: 1, price: 1 }).lean();
  if (!tiers.length) {
    return NextResponse.json({
      data: [
        { name: "Free", price: "$0", cadence: "/month", description: "Perfect for trying out KWL Nexus.", features: ["Access to free apps", "Community support", "1 workspace"], cta: "Get Started", href: "/apps", isPopular: false, order: 0 },
        { name: "Pro", price: "$12", cadence: "/month", description: "For creators and small teams.", features: ["All free features", "Premium apps access", "10 workspaces", "Priority support"], cta: "Upgrade to Pro", href: "/apps", isPopular: true, order: 1 },
        { name: "Premium", price: "$29", cadence: "/month", description: "For growing businesses.", features: ["All Pro features", "Unlimited workspaces", "Advanced analytics", "Dedicated support"], cta: "Go Premium", href: "/apps", isPopular: false, order: 2 },
      ],
    });
  }
  return NextResponse.json({ data: tiers });
}
