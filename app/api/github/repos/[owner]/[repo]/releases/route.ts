import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdmin } from "@/lib/auth/admin";
import { githubFetchFirst, getGithubTokenCandidates } from "@/lib/github/client";

type Release = {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  created_at: string;
  html_url: string;
  assets: { id: number; name: string; size: number; download_count: number; browser_download_url: string }[];
};

// GET /api/github/repos/[owner]/[repo]/releases — Private repo release detect via PAT
export async function GET(request: Request, { params }: { params: { owner: string; repo: string } }) {
  const jwt = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof jwt?.email === "string" ? jwt.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const tokens = await getGithubTokenCandidates(typeof jwt?.githubAccessToken === "string" ? jwt.githubAccessToken : null);
  if (!tokens.length) return NextResponse.json({ error: "GitHub PAT not configured" }, { status: 401 });
  try {
    const releases = await githubFetchFirst<Release[]>(`/repos/${params.owner}/${params.repo}/releases?per_page=20`, tokens);
    // Return lightweight mapped releases for admin UI
    const data = releases.map((r) => ({
      id: r.id,
      tag: r.tag_name,
      name: r.name ?? r.tag_name,
      body: r.body,
      draft: r.draft,
      prerelease: r.prerelease,
      publishedAt: r.published_at ?? r.created_at,
      url: r.html_url,
      assets: r.assets.map((a) => ({ name: a.name, size: a.size, downloads: a.download_count, url: a.browser_download_url })),
    }));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load releases" }, { status: 502 });
  }
}
