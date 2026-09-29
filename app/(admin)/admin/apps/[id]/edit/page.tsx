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
  features?: string[];
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
  const [msgKind, setMsgKind] = useState<"success" | "error" | "">("");
  const [featuresText, setFeaturesText] = useState("");
  const [logoMsg, setLogoMsg] = useState("");

  function handleLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setLogoMsg("Only image files (png/jpg/webp/ico)."); return; }
    if (file.size > 500_000) { setLogoMsg("Logo max 500KB — compress and retry."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((cur) => ({ ...cur, iconUrl: String(reader.result) }));
      setLogoMsg(`Loaded ${file.name} — Save details to apply.`);
    };
    reader.readAsDataURL(file);
  }

  async function load() {
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(params.id)}`, { cache: "no-store" });
      const text = await res.text();
      const j = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(j.error ?? "App not found");
      const d = j.data as AppDoc;
      setApp(d);
      setForm({ name: d.name ?? "", description: d.description ?? "", category: d.category ?? "", pricing: d.pricing ?? "free", websiteUrl: d.websiteUrl ?? "", iconUrl: d.iconUrl ?? "" });
      setFeaturesText(Array.isArray(d.features) ? d.features.join("\n") : "");
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
    setMsgKind("");
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(app.slug || app._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pricing: form.pricing || "free" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setMsg("Details saved.");
      setMsgKind("success");
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
      setMsgKind("error");
    } finally {
      setSaving(false);
    }
  }

  async function saveFeatures(e: React.FormEvent) {
    e.preventDefault();
    if (!app) return;
    const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/apps/${encodeURIComponent(app.slug || app._id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      showToast("Features saved. Use them in Pricing plans.", "success");
      void load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed", "error");
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
            <div className="text-sm font-semibold text-ink/60 dark:text-white/60">
              <p>App logo</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-lg font-bold text-primary">
                  {form.iconUrl ? <img src={form.iconUrl} alt="logo preview" className="h-full w-full object-cover" /> : app.name.slice(0, 1).toUpperCase()}
                </span>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-paper px-4 text-sm text-ink hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-white">
                  Upload image
                  <input type="file" accept="image/*,.ico" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0])} />
                </label>
              </div>
              <input value={form.iconUrl.startsWith("data:") ? "" : form.iconUrl} onChange={(e) => { setForm({ ...form, iconUrl: e.target.value }); setLogoMsg(""); }} placeholder="…or paste logo URL" className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-4 text-sm font-normal text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              {logoMsg && <p className="mt-1.5 text-xs font-normal text-emerald-600 dark:text-emerald-400">{logoMsg}</p>}
            </div>
          </div>
          <div><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"><Save size={15} /> {saving ? "Saving…" : "Save details"}</button>{msg && <span className={`ml-3 text-sm font-semibold ${msgKind === "error" ? "text-red-500 dark:text-red-400" : "text-[#159570] dark:text-emerald-400"}`}>{msg}</span>}</div>
        </form>
      </div>

      <div className="mt-10">
        <h2 className="mb-5 text-2xl font-bold text-ink dark:text-white">Features</h2>
        <p className="mb-4 text-sm text-ink/60 dark:text-white/60">One feature per line. Shown on the store page and available as toggles in Pricing plans. Desktop app sync overwrites this list on next update (last-write-wins).</p>
        <form onSubmit={(e) => void saveFeatures(e)} className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-[#1a1a2e]">
          <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={6} placeholder={"Fast 4K downloads\nNo ads or trackers\nBatch queue with resume"} className="min-h-[140px] w-full resize-y rounded-xl border border-ink/10 bg-paper p-4 text-sm leading-6 text-ink outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
          <button disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"><Save size={15} /> {saving ? "Saving…" : "Save features"}</button>
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
