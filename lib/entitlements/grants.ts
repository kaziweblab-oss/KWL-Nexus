/* eslint-disable @typescript-eslint/no-explicit-any */
import Entitlement from "@/models/Entitlement";
import Subscription from "@/models/Subscription";
import Plan from "@/models/Plan";

// Canonical product key resolution. Plans carry both appId and appSlug (either may be
// set); the raw order ref may be a slug or an ObjectId string. Everything downstream
// matches on the single lowercase appSlug.
export function resolveAppSlug(
  plan: { appSlug?: unknown; appId?: unknown } | null | undefined,
  rawRef?: string | unknown,
): string | null {
  const fromPlan = (plan?.appSlug ?? plan?.appId) as unknown;
  const raw = typeof fromPlan === "string" && fromPlan.trim() ? fromPlan : typeof rawRef === "string" ? rawRef : null;
  if (!raw || !raw.trim()) return null;
  return raw.trim().toLowerCase();
}

// Subscription carries two date pairs (startedAt/endsAt + startDate/endDate).
// Canonical read: endsAt first, endDate fallback. Both are written together on grant.
export function subscriptionExpiry(sub: { endsAt?: unknown; endDate?: unknown } | null | undefined): Date | null {
  const raw = (sub?.endsAt ?? sub?.endDate) as unknown;
  if (!raw) return null;
  const d = raw instanceof Date ? raw : new Date(raw as any);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isLiveEntitlement(e: { status?: unknown; endsAt?: unknown } | null | undefined, now = new Date()): boolean {
  if (!e || e.status !== "active") return false;
  const endsAt = (e.endsAt ?? null) as Date | null;
  if (!endsAt) return true; // lifetime
  const d = endsAt instanceof Date ? endsAt : new Date(endsAt as any);
  return !Number.isNaN(d.getTime()) && d > now;
}

export async function grantEntitlement(input: {
  userId: unknown;
  plan: { appSlug?: unknown; appId?: unknown; interval?: unknown } | null;
  planId?: unknown;
  rawAppRef?: string;
  orderId?: unknown;
  subscriptionId?: unknown;
  endsAt?: Date | null;
}) {
  const appSlug = resolveAppSlug(input.plan, input.rawAppRef);
  if (!appSlug) throw new Error("Cannot resolve app for entitlement");
  const lifetime = (input.plan?.interval as string | undefined) === "lifetime";
  return Entitlement.create({
    userId: input.userId,
    appSlug,
    planId: input.planId ?? null,
    orderId: input.orderId ?? null,
    subscriptionId: input.subscriptionId ?? null,
    type: lifetime ? "lifetime" : "subscription",
    status: "active",
    startedAt: new Date(),
    endsAt: lifetime ? null : (input.endsAt ?? null),
  });
}

// Unified access check for protected downloads: new Entitlement docs first, then
// legacy active Subscriptions joined through their Plan (pre-entitlement grants).
export async function checkAppAccess(userId: unknown, appRefs: Array<string | unknown>): Promise<{ allowed: boolean; via: "entitlement" | "subscription" | null }> {
  const now = new Date();
  const slugs = Array.from(new Set(appRefs.filter((r) => typeof r === "string" && (r as string).trim()).map((r) => String(r).trim().toLowerCase())));
  if (!slugs.length) return { allowed: false, via: null };
  const ent = await Entitlement.findOne({
    userId,
    appSlug: { $in: slugs },
    status: "active",
    $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
  })
    .select("_id")
    .lean();
  if (ent) return { allowed: true, via: "entitlement" };
  // Legacy path: active subscription whose plan maps to this app.
  const subs = await Subscription.find({
    userId,
    status: "active",
    $or: [{ endsAt: { $gt: now } }, { endDate: { $gt: now } }, { endsAt: null, endDate: null }],
  })
    .select("planId")
    .lean() as Array<{ planId?: unknown }>;
  for (const sub of subs) {
    if (!sub.planId) continue;
    try {
      const plan = await Plan.findById(sub.planId).select("appId appSlug").lean() as { appId?: unknown; appSlug?: unknown } | null;
      const slug = resolveAppSlug(plan, null);
      if (slug && slugs.includes(slug)) return { allowed: true, via: "subscription" };
    } catch {}
  }
  return { allowed: false, via: null };
}
