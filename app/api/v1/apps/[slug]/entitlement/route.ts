/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { authenticateApiRequest, assertKeyScope, hasKeyScope } from "@/lib/api/auth";
import Entitlement from "@/models/Entitlement";
import { v1ok, v1err } from "@/lib/v1/respond";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

// License check for desktop apps and integrations.
// Auth: session cookie OR x-api-key (scoped to the app + entitlement:read).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const slug = String(params.slug ?? "").toLowerCase();
  if (!slug) return v1err("APP_NOT_FOUND", "App not found", 404);
  const auth = await authenticateApiRequest(req);
  if ("error" in auth) {
    const err = auth as { error?: string; status?: number };
    return v1err("UNAUTHORIZED", err.error ?? "Unauthorized", err.status ?? 401);
  }
  if (!hasKeyScope(auth, "entitlement:read")) {
    return v1err("FORBIDDEN_SCOPE", "This API key lacks the entitlement:read scope", 403);
  }
  const scoped = await assertKeyScope(auth, { slug });
  if (scoped) return v1err("FORBIDDEN_SCOPE", scoped.error, scoped.status);
  await connectToDatabase();
  const now = new Date();
  const ent = (await Entitlement.findOne({
    userId: (auth as any).userId,
    appSlug: slug,
    status: "active",
    $or: [{ endsAt: null }, { endsAt: { $gt: now } }],
  })
    .select("type endsAt")
    .lean()) as { type?: string; endsAt?: Date | null } | null;
  if (!ent) return v1ok({ hasAccess: false, app: slug });
  return v1ok({ hasAccess: true, app: slug, type: ent.type ?? "subscription", endsAt: ent.endsAt ?? null, lifetime: !ent.endsAt });
}
