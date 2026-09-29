"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Loader2, Rocket, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { TutorialEditor } from "@/components/admin/TutorialEditor";
import { AppMediaManager } from "@/components/admin/AppMediaManager";
import { AppReleaseManager } from "@/components/admin/AppReleaseManager";

type AppDoc = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  pricing?: "free" | "paid" | "freemium";
  websiteUrl?: string;
  iconUrl?: string;
  isPublished: boolean;
  isNewRelease?: boolean;
  githubOwner?: string;
  githubRepo?: string;
  latestVersion?: string | null;
  downloadUrl?: { android?: string; windows?: string; linux?: string };
  tutorial?: { videoUrl?: string; videoType?: "youtube" | "vimeo" | "custom"; title?: string; description?: string; isActive?: boolean };
};

// DB-driven editor: details + GitHub releases + publish + media + tutorial.
// (Previously read the dummy catalog, so imported drafts hit 404.)
export default function AdminAppEditPage({ params }: { params: { id: string } }) {
  const { showToast } = useToast();  const [app, setApp] = useState<AppDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", description: "", category: "", pricing: "free", websiteUrl: "", iconUrl: "" });

  async function load() {
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(params.id)}`, { cache: "no-store" });
      const text = await res.text();
      const j = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(j.error ?? "App not found");
      const d = j.data as AppDoc;
      setApp(d);
      setForm({ name: d.name ?? "", description: d.description ?? "", category: d.category ?? "", pricing: d.pricing ?? "free", websiteUrl: d.websiteUrl ?? "", iconUrl: d.iconUrl ?? "" });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load app");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [params.id]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(app.slug || app._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pricing: form.pricing || "free" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setMsg("Details saved.");
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!app) return;
    const next = !app.isPublished;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(app.slug || app._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setApp({ ...app, isPublished: next });
      showToast(next ? "Published! App is now live in the store." : "Unpublished. App is back to draft.", next ? "success" : "warning");
    } catch {
      const message = "Publish toggle failed — set a version + download URL first, then retry.";
      setMsg(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="grid place-items-center py-24 text-sm text-ink/50 dark:text-white/50"><Loader2 className="animate-spin" size={22} /></main>;
  }
  if (error || !app) {
    return (
      <main>
        <Link href="/admin/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary"><ArrowLeft size={16} /> Back to apps</Link>
        <p className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error || "App not found"}</p>
      </main>
    );
  }

  const key = app.slug || app._id;
  return (
    <main>
      <Link href="/admin/apps" className="flex items-center gap-2 text-sm font-semibold text-ink/50 hover:text-primary dark:text-white/50"><ArrowLeft size={16} /> Back to apps</Link>
      <div className="mt-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">App editor</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">Edit {app.name}</h1>
          <p className="mt-2 text-ink/55 dark:text-white/55">Details, releases, publish, preview and tutorial.</p>
        </div>
        <button disabled={saving} onClick={() => void togglePublish()} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 ${app.isPublished ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
          <Rocket size={15} /> {app.isPublished ? "Unpublish" : "Publish"}
        </button>
      </div>
      {!app.isPublished ? (
        <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Draft — invisible in store. Flow: pick a release below (sets version + .apk/.exe/.deb) → save details → Publish.
          {app.latestVersion ? ` Current version: v${app.latestVersion}.` : " No version yet."}
        </p>
      ) : (
        <p className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <span>Live in store{app.latestVersion ? ` · v${app.latestVersion}` : ""}.</span>
          <Link href={`/apps/${app.slug || app._id}`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            View in store <ExternalLink size={12} />
          </Link>
        </p>
      )}

      <div className="mt-8">
        <h2 className="mb-5 text-2xl font-bold text-ink dark:text-white">GitHub releases</h2>
        <AppReleaseManager owner={app.githubOwner ?? ""} repo={app.githubRepo ?? ""} appSlug={key} currentVersion={app.latestVersion} onApplied={() => void load()} />
      </div>

      <div className="mt-10">
        <h2 className="mb-5 text-2xl font-bold text-ink dark:text-white">Details</h2>
        <form onSubmit={(e) => void saveDetails(e)} className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
          <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
          <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={4} className="mt-2 min-h-[112px] w-full resize-none rounded-xl border border-ink/10 bg-paper p-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Pricing<select value={form.pricing} onChange={(e) => setForm({ ...form, pricing: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"><option value="free">free</option><option value="paid">paid</option><option value="freemium">freemium</option></select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Website URL<input value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} placeholder="https://…" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
            <label className="block text-sm font-semibold text-ink/60 dark:text-white/60">Icon URL<input value={form.iconUrl} onChange={(e) => setForm({ ...form, iconUrl: e.target.value })} placeholder="https://…" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" /></label>
          </div>
          <div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"><Save size={15} /> {saving ? "Saving…" : "Save details"}</button>{msg && <span className="ml-3 text-sm text-[#159570]">{msg}</span>}</div>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="mb-5 text-2xl font-bold text-ink dark:text-white">Preview & Screenshots</h2>
        <p className="mb-4 text-sm text-ink/60 dark:text-white/60">Change main preview (center carousel) and all screenshots. These appear on the marketplace detail page.</p>
        <AppMediaManager appId={key} />
      </div>
      <div className="mt-10">
        <h2 className="mb-5 text-2xl font-bold text-ink dark:text-white">Tutorial</h2>
        <TutorialEditor appId={key} initial={app.tutorial} />
      </div>
    </main>
  );
}
