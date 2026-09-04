import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isAdmin } from "@/lib/auth/admin";
import { githubFetch, getConfiguredGithubIntegrationToken } from "@/lib/github/client";

type GithubRepo = { id: number; name: string; full_name: string; description: string | null; html_url: string; default_branch: string; private: boolean; updated_at: string };

// GET /api/github/repos — repositories require the configured GitHub integration PAT
export async function GET(request: Request) {
  const jwt = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof jwt?.email === "string" ? jwt.email : null;
  if (!email || !(await isAdmin(email))) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const token = await getConfiguredGithubIntegrationToken();
  if (!token) return NextResponse.json({ error: "GitHub integration is not configured. Add GitHub in Project integrations and set a personal access token." }, { status: 401 });
  try {
    // affiliation=owner,collaborator,organization_member includes private repos; visibility=all includes private
    const repos = await githubFetch<GithubRepo[]>("/user/repos?sort=updated&per_page=100&visibility=all&affiliation=owner,collaborator,organization_member", token);
    return NextResponse.json(repos.map(({ id, name, full_name, description, html_url, default_branch, private: isPrivate, updated_at }) => ({ id, name, fullName: full_name, description, url: html_url, defaultBranch: default_branch, private: isPrivate, updatedAt: updated_at })));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load repositories" }, { status: 502 });
  }
}
