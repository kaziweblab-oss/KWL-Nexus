import Plan from "@/models/Plan";
import App from "@/models/App";
import { isValidObjectId } from "mongoose";

// Derive app.pricing from its active plans so the editor badge + store filters stay truthful:
// no active plans (or all free) -> free, mixed -> freemium, all paid -> paid.
// Best-effort: never throws, never blocks the plan mutation.
export async function syncAppPricing(appRef: string | null | undefined) {
  if (!appRef) return;
  try {
    const active = (await Plan.find({ $or: [{ appId: appRef }, { appSlug: appRef }], isActive: { $ne: false } })
      .select("price")
      .lean()) as { price?: number }[];
    let pricing = "free";
    if (active.length) {
      const paid = active.filter((p) => (p.price ?? 0) > 0).length;
      pricing = paid === 0 ? "free" : paid === active.length ? "paid" : "freemium";
    }
    const filter = isValidObjectId(appRef) ? { _id: appRef } : { slug: appRef };
    await App.updateOne(filter, { pricing });
  } catch {}
}
