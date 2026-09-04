import { GithubTokenManager } from "@/components/admin/GithubTokenManager";

export default function GithubSettingsPage() {
  return (
    <main>
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">GitHub integration</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">GitHub Token</h1>
      <p className="mt-2 text-ink/55">Set PAT to browse private repositories and auto-download private releases.</p>
      <div className="mt-8">
        <GithubTokenManager />
      </div>
      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/5 dark:bg-[#1a1a2e]">
        <h3 className="font-bold text-ink dark:text-white">How private download works</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/60 dark:text-white/60">
          <li>User clicks Download on app detail → GET /api/apps/[id]/download</li>
          <li>Server resolves PAT (DB &gt; GITHUB_TOKEN env &gt; OAuth) and fetches release via GitHub API</li>
          <li>Returns direct downloadUrl or proxyUrl for private assets → browser auto-downloads</li>
          <li>Admin can browse private repos at /admin/apps/new (now includes private via PAT)</li>
        </ul>
      </div>
    </main>
  );
}
