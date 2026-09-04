import { connectToDatabase } from "@/lib/db/connect";
import PricingTier from "@/models/PricingTier";
import { PricingClient } from "@/components/pricing/PricingClient";

export default async function PricingPage() {
  let plans: { name: string; price: string; cadence: string; description: string; features: string[]; cta: string; href: string; isPopular?: boolean }[] = [];
  try {
    await connectToDatabase();
    const tiers = await PricingTier.find({ isActive: true }).sort({ order: 1 }).lean();
    if (tiers.length) {
      plans = tiers.map((t) => ({
        name: t.name,
        price: t.price,
        cadence: t.cadence,
        description: t.description,
        features: t.features,
        cta: t.cta,
        href: t.href,
        isPopular: t.isPopular,
      }));
    }
  } catch {}

  return <PricingClient plans={plans} />;
}
