import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db/connect";
import Plan from "@/models/Plan";
import App from "@/models/App";
import AppVersion from "@/models/AppVersion";
import Feedback from "@/models/Feedback";

function isObjectIdLike(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}
import { MarketplaceDetailClient } from "@/components/marketplace/MarketplaceDetailClient";
import { PaymentRequestForm } from "@/components/shared/PaymentRequestForm";
import { FeedbackForm } from "@/components/shared/FeedbackForm";

// Marketplace detail — DB-driven (published apps). Dummy catalog is no longer consulted,
// so GitHub-imported apps resolve by slug or ObjectId instead of 404.
export default async function AppDetailPage({ params }: { params: { id: string } }) {
  await connectToDatabase().catch(() => null);

  const or: Record<string, unknown>[] = [{ slug: params.id }, { slug: params.id.toLowerCase() }];
  if (isObjectIdLike(params.id)) or.push({ _id: params.id });

  type DbApp = {
    _id: unknown;
    name: string;
    slug: string;
    description: string;
    category: string;
    iconUrl?: string;
    downloadCount?: number;
    latestVersion?: string;
    features?: string[];
    screenshots?: string[];
    previewImageUrl?: string;
    previewVideoUrl?: string;
    tutorial?: { videoUrl?: string; videoType?: string; isActive?: boolean };
    screenshotVideos?: string[];
    downloadUrl?: { android?: string; windows?: string; linux?: string; apk?: string; exe?: string; deb?: string };
    size?: string;
    githubOwner?: string;
    updatedAt?: Date;
  };
  const dbApp = (await App.findOne({ isPublished: true, $or: or }).lean().catch(() => null)) as unknown as DbApp | null;
  if (!dbApp) notFound();

  const appId = String((dbApp._id as { toString(): string }).toString());
  const slug = dbApp.slug;

  type DbPlan = { name: string; price: number; interval: string; durationDays?: number | null; refundEnabled?: boolean; refundDays?: number | null; description?: string; isActive?: boolean; features?: string[] };
  let plans: { name: string; price: string; cadence: string; refundEnabled?: boolean; refundDays?: number | null; description: string; featured?: boolean; features: string[] }[] = [];
  try {
    const dbPlans = await Plan.find({ $or: [{ appId }, { appId: slug }, { appSlug: slug }] }).lean<DbPlan[]>();
    plans = dbPlans
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        name: p.name,
        price: p.price === 0 ? "Free" : `$${p.price}`,
        cadence: p.interval === "lifetime" ? " one-time" : p.interval === "custom" ? ` / ${p.durationDays ?? "custom"} days` : `/${p.interval}`,
        refundEnabled: p.refundEnabled,
        refundDays: p.refundDays,
        description: p.description || "",
        featured: p.isActive,
        features: p.features ?? [],
      }));
  } catch {}

  type DbVersion = { version: string; tag?: string; urls?: { android?: string; windows?: string; linux?: string }; createdAt?: Date; notes?: string };
  let versions: { version: string; tag?: string; urls?: { android?: string; windows?: string; linux?: string }; date: string; notes: string }[] = [];
  try {
    const dbVersions = await AppVersion.find({ appId }).sort({ createdAt: -1 }).lean<DbVersion[]>();
    versions = dbVersions.map((v) => ({
      version: v.version,
      tag: v.tag,
      urls: v.urls,
      date: v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
      notes: v.notes || "",
    }));
  } catch {}
  if (!versions.length && dbApp.latestVersion) {
    versions = [{ version: dbApp.latestVersion, date: "", notes: "Current release." }];
  }

  // Real review stats from user feedback (no invented ratings).
  let reviewCount = 0;
  let rating = "";
  try {
    const stats = (await Feedback.aggregate([
      { $match: { appId: dbApp._id as unknown as object } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: "$rating" } } },
    ]).catch(() => [])) as { count?: number; avg?: number }[];
    reviewCount = stats[0]?.count ?? 0;
    if (stats[0]?.avg) rating = stats[0].avg.toFixed(1);
  } catch {}

  const urls = dbApp.downloadUrl ?? {};
  const platforms: string[] = [];
  if (urls.android || urls.apk) platforms.push("Android");
  if (urls.windows || urls.exe) platforms.push("Windows");
  if (urls.linux || urls.deb) platforms.push("Linux");

  const screenshots = dbApp.screenshots?.length ? dbApp.screenshots : [];
  const masterFeatures = dbApp.features ?? [];

  return (
    <>
      <MarketplaceDetailClient
        app={{
          id: slug,
          name: dbApp.name,
          category: dbApp.category,
          icon: dbApp.name.slice(0, 1).toUpperCase(),
          iconUrl: dbApp.iconUrl || null,
          latestVersion: dbApp.latestVersion || null,
          accent: "#6C63FF",
          rating,
          downloads: String(dbApp.downloadCount ?? 0),
          description: dbApp.description,
          longDescription: dbApp.description,
          platforms,
          features: masterFeatures,
          versions,
          downloadUrls: dbApp.downloadUrl,
          updatedAt: dbApp.updatedAt ? new Date(dbApp.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
          size: dbApp.size || "",
          developer: dbApp.githubOwner || "KWL Nexus",
        }}
        plans={plans}
        reviewCount={reviewCount}
        screenshots={screenshots}
        previewImageUrl={dbApp.previewImageUrl}
        previewVideoUrl={dbApp.previewVideoUrl || (dbApp.tutorial?.isActive === false ? undefined : dbApp.tutorial?.videoUrl)}
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {plans.length > 0 && <PaymentRequestForm appName={dbApp.name} amount={plans[0]?.price ?? "Free"} />}
        <FeedbackForm appId={slug} />
      </div>
    </>
  );
}
