import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import SystemConfig from "@/models/SystemConfig";
import { encryptToken, decryptToken } from "@/lib/github/client";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  if (!(await isAdmin(session.user.email))) return null;
  return session;
}

// GET — return masked token status + GitHub profile card data (never reveal full token)
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const cfg = await SystemConfig.findOne().select("+githubToken githubTokenLastUpdated").lean() as unknown as { githubToken?: string; githubTokenLastUpdated?: Date } | null;
    const hasToken = Boolean(cfg?.githubToken || process.env.GITHUB_TOKEN);
    const source = cfg?.githubToken ? "database" : process.env.GITHUB_TOKEN ? "env" : "none";
    let masked: string | null = null;
    let rawToken: string | null = null;
    if (cfg?.githubToken) {
      try {
        const dec = decryptToken(cfg.githubToken);
        rawToken = dec;
        masked = dec.slice(0, 4) + "****" + dec.slice(-4);
      } catch {
        masked = "****";
      }
    } else if (process.env.GITHUB_TOKEN) {
      const t = process.env.GITHUB_TOKEN;
      rawToken = t;
      masked = t.slice(0, 4) + "****" + t.slice(-4);
    }
    // Fetch GitHub profile for card (login, name, avatar_url) if token available
    let githubUser: { login: string; name: string | null; avatarUrl: string | null } | null = null;
    if (rawToken) {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${rawToken}`, "X-GitHub-Api-Version": "2022-11-28" },
          next: { revalidate: 60 },
        });
        if (res.ok) {
          const u = (await res.json()) as { login?: string; name?: string | null; avatar_url?: string | null };
          githubUser = { login: u.login ?? "", name: u.name ?? null, avatarUrl: u.avatar_url ?? null };
        }
      } catch {}
    }
    return NextResponse.json({ hasToken, source, masked, lastUpdated: cfg?.githubTokenLastUpdated ?? null, githubUser, githubDefaultOwner: (cfg as unknown as { githubDefaultOwner?: string })?.githubDefaultOwner ?? null, githubDefaultRepo: (cfg as unknown as { githubDefaultRepo?: string })?.githubDefaultRepo ?? null });
  } catch (error) {
    // Database unavailable — still report env fallback so UX can guide to .env fix
    const hasEnv = Boolean(process.env.GITHUB_TOKEN);
    let githubUser: { login: string; name: string | null; avatarUrl: string | null } | null = null;
    if (hasEnv) {
      try {
        const res = await fetch("https://api.github.com/user", {
          headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" },
          next: { revalidate: 60 },
        });
        if (res.ok) {
          const u = (await res.json()) as { login?: string; name?: string | null; avatar_url?: string | null };
          githubUser = { login: u.login ?? "", name: u.name ?? null, avatarUrl: u.avatar_url ?? null };
        }
      } catch {}
    }
    return NextResponse.json(
      {
        hasToken: hasEnv,
        source: hasEnv ? "env" : "none",
        masked: hasEnv ? process.env.GITHUB_TOKEN!.slice(0, 4) + "****" + process.env.GITHUB_TOKEN!.slice(-4) : null,
        lastUpdated: null,
        githubUser,
        error: hasEnv ? undefined : error instanceof Error ? error.message : "Database unavailable",
      },
      { status: hasEnv ? 200 : 503 },
    );
  }
}

// PUT — set/update PAT (encrypted at rest)
export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
  if (!token.startsWith("ghp_") && !token.startsWith("github_pat_")) {
    return NextResponse.json({ error: "Invalid PAT format (expected ghp_ or github_pat_)" }, { status: 400 });
  }
  try {
    await connectToDatabase();
    const encrypted = encryptToken(token);
    let cfg = await SystemConfig.findOne();
    if (!cfg) cfg = new SystemConfig({ githubToken: encrypted, githubTokenLastUpdated: new Date() });
    else {
      (cfg as unknown as { githubToken: string }).githubToken = encrypted;
      (cfg as unknown as { githubTokenLastUpdated: Date }).githubTokenLastUpdated = new Date();
    }
    await cfg.save();
    // Professional: auto-collect default owner/repo from GitHub and persist
    try {
      const uRes = await fetch("https://api.github.com/user", {
        headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
      });
      if (uRes.ok) {
        const u = (await uRes.json()) as { login?: string };
        if (u.login) {
          (cfg as unknown as { githubDefaultOwner: string }).githubDefaultOwner = u.login;
          (cfg as unknown as { githubOwner: string }).githubOwner = u.login;
          try {
            const rRes = await fetch("https://api.github.com/user/repos?per_page=1&sort=updated", {
              headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" },
            });
            if (rRes.ok) {
              const repos = (await rRes.json()) as Array<{ name?: string }>;
              if (repos[0]?.name) (cfg as unknown as { githubDefaultRepo: string }).githubDefaultRepo = repos[0].name;
            }
          } catch {}
          await cfg.save();
        }
      }
    } catch {}
    return NextResponse.json({ success: true, masked: token.slice(0, 4) + "****" + token.slice(-4) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable — check MongoDB connection" }, { status: 503 });
  }
}

// DELETE — remove DB token (fallback to env)
export async function DELETE() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    await connectToDatabase();
    const cfg = await SystemConfig.findOne();
    if (cfg) {
      (cfg as unknown as { githubToken: string }).githubToken = "";
      (cfg as unknown as { githubTokenLastUpdated: Date | null }).githubTokenLastUpdated = null as unknown as Date;
      await cfg.save();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Database unavailable" }, { status: 503 });
  }
}
