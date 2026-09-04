import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdminEmail } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import App from "@/models/App";

// Convert trusted repository metadata into the store's canonical App document.
export async function POST(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === "string" ? token.email : null;
  if (!email || !isAdminEmail(email)) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as { owner?: string; repo?: string; name?: string; description?: string; url?: string; config?: { name?: string; description?: string; category?: string; iconUrl?: string; websiteUrl?: string } | null };
  // Professional: support both `repo` and `name` as repo identifier, and fallback to SystemConfig default owner
  let owner = body.owner?.trim();
  const repo = (body.repo ?? body.name)?.trim();
  if (!owner) {
    try {
      await connectToDatabase();
      const cfg = await (await import("@/models/SystemConfig")).default.findOne().lean() as unknown as { githubDefaultOwner?: string; githubOwner?: string } | null;
      owner = cfg?.githubDefaultOwner ?? cfg?.githubOwner ?? owner;
    } catch {}
  }
  if (!owner || !repo) return NextResponse.json({ error: "Repository owner and name are required" }, { status: 400 });
  const config = body.config ?? {};
  const name = config.name?.trim() || repo;
  if (!name) return NextResponse.json({ error: "Repository name is required" }, { status: 400 });
  await connectToDatabase();
  // Persist manual owner as new default for all future connects (professional)
  try {
    const cfgDef = await (await import("@/models/SystemConfig")).default.findOne();
    if (cfgDef && owner) {
      const curOwner = (cfgDef as unknown as { githubDefaultOwner?: string }).githubDefaultOwner;
      if (!curOwner || curOwner !== owner) {
        (cfgDef as unknown as { githubDefaultOwner: string }).githubDefaultOwner = owner;
        (cfgDef as unknown as { githubOwner: string }).githubOwner = owner;
        await cfgDef.save();
      }
    }
  } catch {}
  const app = await App.findOneAndUpdate({ githubOwner: owner, githubRepo: repo }, { name, slug: `${owner}-${repo}`.toLowerCase().replace(/[^a-z0-9-]/g, "-"), description: config.description?.trim() || body.description?.trim() || "Imported from GitHub", category: config.category?.trim() || "Development", iconUrl: config.iconUrl, websiteUrl: config.websiteUrl || body.url, githubOwner: owner, githubRepo: repo, githubUrl: body.url, isPublished: false }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return NextResponse.json({ id: app._id.toString(), name: app.name, status: "draft" }, { status: 201 });
}
