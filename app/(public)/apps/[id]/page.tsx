import { notFound } from "next/navigation";
import { getApp } from "@/lib/data/apps";
import { connectToDatabase } from "@/lib/db/connect";
import Plan from "@/models/Plan";
import App from "@/models/App";
import { MarketplaceDetailClient } from "@/components/marketplace/MarketplaceDetailClient";
import { PaymentRequestForm } from "@/components/shared/PaymentRequestForm";
import { FeedbackForm } from "@/components/shared/FeedbackForm";

// Marketplace detail - dark reference implant, redesign from current UI
export default async function AppDetailPage({ params }: { params: { id: string } }) {
  const app = getApp(params.id);
  if (!app) notFound();

  let plans = app.plans;
  try {
    await connectToDatabase();
    type DbPlan = { name: string; price: number; interval: string; durationDays?: number | null; refundEnabled?: boolean; refundDays?: number | null; description?: string; isActive?: boolean; features?: string[] };
    const dbPlans = await Plan.find({ $or: [{ appId: params.id }, { appSlug: params.id }] }).lean<DbPlan[]>();
    if (dbPlans.length) {
      plans = dbPlans
        .filter((p) => p.isActive !== false)
        .map((p) => ({
          name: p.name,
          price: `$${p.price}`,
          cadence: p.interval === "lifetime" ? " one-time" : p.interval === "custom" ? ` / ${p.durationDays ?? "custom"} days` : `/${p.interval}`,
          refundEnabled: p.refundEnabled,
          refundDays: p.refundDays,
          description: p.description || "",
          featured: p.isActive,
          features: p.features ?? [],
        }));
    }
  } catch {}

  let screenshots = app.screenshots ?? ["Workspace", "Quick setup", "Daily view", "Analytics"];
  let masterFeatures = app.features ?? [];
  let previewImageUrl: string | undefined;
  let previewVideoUrl: string | undefined;
  try {
    const dbApp = (await App.findOne({ slug: params.id.toLowerCase() }).lean()) as unknown as { features?: string[]; screenshots?: string[]; previewImageUrl?: string; previewVideoUrl?: string; screenshotVideos?: string[] } | null;
    if (dbApp?.features?.length) masterFeatures = dbApp.features;
    if (dbApp?.screenshots?.length) {
      // if first item is video, keep order; manager ensures video first
      screenshots = dbApp.screenshots;
    }
    if (dbApp?.screenshotVideos?.length && dbApp.screenshotVideos[0]) {
      // ensure video is first
      const vid = dbApp.screenshotVideos[0];
      screenshots = [vid, ...screenshots.filter((s) => s !== vid)];
    }
    if (dbApp?.previewImageUrl) previewImageUrl = dbApp.previewImageUrl;
    if (dbApp?.previewVideoUrl) previewVideoUrl = dbApp.previewVideoUrl;
  } catch {}

  return (
    <>
      <MarketplaceDetailClient app={{ ...app, features: masterFeatures }} plans={plans} screenshots={screenshots} previewImageUrl={previewImageUrl} previewVideoUrl={previewVideoUrl} />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <PaymentRequestForm appName={app.name} amount={plans[0]?.price ?? app.plans[0].price} />
        <FeedbackForm appId={app.id} />
      </div>
    </>
  );
}
