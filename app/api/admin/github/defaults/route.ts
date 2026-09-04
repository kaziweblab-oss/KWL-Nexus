import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import SystemConfig from "@/models/SystemConfig";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

// GET — return current defaults
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const cfg = await SystemConfig.findOne().lean() as unknown as { githubDefaultOwner?: string; githubDefaultRepo?: string; githubOwner?: string } | null;
    return NextResponse.json({ githubDefaultOwner: cfg?.githubDefaultOwner ?? cfg?.githubOwner ?? null, githubDefaultRepo: cfg?.githubDefaultRepo ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}

// PUT — set defaults from manual input, persists for all future connects
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  let body: { owner?: string; repo?: string; githubDefaultOwner?: string; githubDefaultRepo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const owner = (body.owner ?? body.githubDefaultOwner)?.trim();
  const repo = (body.repo ?? body.githubDefaultRepo)?.trim();
  if (!owner) return NextResponse.json({ error: "owner is required" }, { status: 400 });
  // repo is optional — owner alone is enough for default
  try {
    await connectToDatabase();
    let cfg = await SystemConfig.findOne();
    if (!cfg) cfg = new SystemConfig({ githubDefaultOwner: owner, githubDefaultRepo: repo ?? "", githubOwner: owner });
    else {
      (cfg as unknown as { githubDefaultOwner: string }).githubDefaultOwner = owner;
      (cfg as unknown as { githubOwner: string }).githubOwner = owner;
      if (repo !== undefined) (cfg as unknown as { githubDefaultRepo: string }).githubDefaultRepo = repo;
    }
    await cfg.save();
    return NextResponse.json({ success: true, githubDefaultOwner: owner, githubDefaultRepo: repo ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "DB error" }, { status: 500 });
  }
}
