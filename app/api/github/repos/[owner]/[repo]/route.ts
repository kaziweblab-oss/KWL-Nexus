import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdmin } from "@/lib/auth/admin";
import { githubFetch, getEffectiveGithubToken } from "@/lib/github/client";

type Repository = { id: number; name: string; full_name: string; description: string | null; html_url: string; default_branch: string; owner: { login: string }; };
type ConfigFile = { content?: string; encoding?: string; };

// Fetch repository metadata and optionally decode the repository's kwl-config.json.
export async function GET(request: Request, { params }: { params: { owner: string; repo: string } }) {
  const jwt = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof jwt?.email === "string" ? jwt.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const githubAccessToken = typeof jwt?.githubAccessToken === "string" ? jwt.githubAccessToken : null;
  const token = await getEffectiveGithubToken(githubAccessToken);
  if (!token) return NextResponse.json({ error: "GitHub PAT not configured" }, { status: 401 });
  try {
    const repository = await githubFetch<Repository>(`/repos/${params.owner}/${params.repo}`, token);
    let config: unknown = null;
    try {
      const file = await githubFetch<ConfigFile>(`/repos/${params.owner}/${params.repo}/contents/kwl-config.json`, token);
      if (file.content && file.encoding === "base64") config = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
    } catch { config = null; }
    return NextResponse.json({ id: repository.id, name: repository.name, fullName: repository.full_name, description: repository.description, url: repository.html_url, defaultBranch: repository.default_branch, owner: repository.owner.login, config });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load repository" }, { status: 502 });
  }
}
