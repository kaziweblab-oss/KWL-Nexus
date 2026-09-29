"use client";

import { Check, GitBranch, Loader2, Search, Lock, Globe, Star, ExternalLink, Code2, X, KeyRound, Save } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Repo = { id: number; name: string; fullName: string; description: string | null; url: string; defaultBranch: string; private: boolean };
type Detail = Repo & { owner: string; config: unknown };

// Tries logo candidates in order; falls back to letter avatar when none load.
function DetectedLogo({ candidates, name, logoIdx, logoOff, onAdvance, onEmpty }: { candidates: string[]; name: string; logoIdx: number; logoOff: boolean; onAdvance: () => void; onEmpty: () => void }) {
  const src = !logoOff && logoIdx < candidates.length ? candidates[logoIdx] : null;
  if (!src) {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-white dark:bg-secondary dark:text-ink">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      className="h-11 w-11 shrink-0 rounded-2xl border border-ink/10 object-cover dark:border-white/10"
      onError={() => {
        if (logoIdx + 1 < candidates.length) onAdvance();
        else onEmpty();
      }}
    />
  );
}

// Logo candidates probed client-side (no extra API calls): first loadable image wins.
function logoCandidates(owner: string, fullName: string, branch: string, configIcon?: string) {
  const out: string[] = [];
  if (configIcon) out.push(configIcon);
  const base = `https://raw.githubusercontent.com/${fullName}/${branch}`;
  for (const p of ["icon.png", "logo.png", "assets/icon.png", "assets/logo.png", "src-tauri/icons/128x128.png", "src-tauri/icons/icon.png", "public/icon.png", "public/logo.png"]) {
    out.push(`${base}/${p}`);
  }
  return out;
}

export function GithubRepoBrowser() {
  const { t } = useLanguage();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [defaultOwner, setDefaultOwner] = useState<string | null>(null);
  const [manualOwner, setManualOwner] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);
  const [savedAppId, setSavedAppId] = useState("");
  const [savedAppName, setSavedAppName] = useState("");
  const [logoIdx, setLogoIdx] = useState(0);
  const [logoOff, setLogoOff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadDefaults() {
      try {
        const res = await fetch("/api/admin/github/token");
        const j = await res.json();
        if (!cancelled && j.githubDefaultOwner) {
          setDefaultOwner(j.githubDefaultOwner);
          setManualOwner(j.githubDefaultOwner);
        } else {
          const r2 = await fetch("/api/admin/github/defaults").then((r) => r.json()).catch(() => ({}));
          if (!cancelled && r2.githubDefaultOwner) {
            setDefaultOwner(r2.githubDefaultOwner);
            setManualOwner(r2.githubDefaultOwner);
          }
        }
      } catch {}
    }
    loadDefaults();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRepos() {
      try {
        const res = await fetch("/api/github/repos");
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (!res.ok) throw new Error((data && (data.error ?? data.message)) ?? `Failed to load repos (${res.status})`);
        if (!cancelled) {
          const list: Repo[] = Array.isArray(data) ? data : data?.data ?? [];
          setRepos(list);
          setError("");
          if (list.length > 0) setShowManual(false);
          else setShowManual(true);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load repositories");
          setShowManual(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadRepos();
    return () => { cancelled = true; };
  }, []);

  const visible = repos.filter((r) => `${r.name} ${r.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  async function selectRepo(repo: Repo) {
    try {
      const [owner, name] = repo.fullName.split("/");
      // Auto-fill manual fields with the login owner so Add works without typing.
      if (owner) setManualOwner(owner);
      if (name) setManualRepo(name);
      const res = await fetch(`/api/github/repos/${owner}/${name}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error ?? `Failed to load repo (${res.status})`);
      setSelected(data);
      setLogoIdx(0);
      setLogoOff(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load repository");
    }
  }

  async function saveDefaultOwner() {
    if (!manualOwner.trim()) return;
    setSavingDefault(true);
    try {
      const res = await fetch("/api/admin/github/defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: manualOwner.trim(), repo: manualRepo.trim() || undefined }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save default");
      setDefaultOwner(manualOwner.trim());
      setSaved(`${t("defaultOwner")} ${manualOwner.trim()}${manualRepo.trim() ? `/${manualRepo.trim()}` : ""} — will be used for all future connects`);
      setTimeout(() => setSaved(""), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save default");
    } finally {
      setSavingDefault(false);
    }
  }

  async function addSelectedRepo() {
    if (!selected) return;
    try {
      setError("");
      setSaved("");
      setSavedAppId("");
      const logos = logoCandidates(selected.owner, selected.fullName, selected.defaultBranch, (selected.config as { iconUrl?: string } | null)?.iconUrl);
      const detectedIcon = !logoOff && logos[logoIdx] ? logos[logoIdx] : undefined;
      const res = await fetch("/api/github/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...selected, config: { ...((selected.config as Record<string, unknown> | null) ?? {}), ...(detectedIcon ? { iconUrl: detectedIcon } : {}) } }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error ?? "Unable to save app");
      setSaved(`${data.name} ${t("savedAsDraft")}.`);
      if (data.id) { setSavedAppId(data.id); setSavedAppName(data.name ?? selected.name); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save app");
    }
  }

  async function addManualRepo() {
    if (!manualOwner.trim() || !manualRepo.trim()) {
      setError(t("repositoryOwnerRequired"));
      return;
    }
    try {
      setError("");
      setSaved("");
      // save as default for future
      await fetch("/api/admin/github/defaults", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner: manualOwner.trim(), repo: manualRepo.trim() }) }).catch(() => {});
      setDefaultOwner(manualOwner.trim());
      const res = await fetch("/api/github/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: manualOwner.trim(), repo: manualRepo.trim(), name: manualRepo.trim() }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error ?? "Unable to save app");
      setSaved(`${data.name} ${t("savedAsDraft")} (owner: ${manualOwner.trim()}).`);
      if (data.id) { setSavedAppId(data.id); setSavedAppName(data.name ?? manualRepo.trim()); }
      setManualRepo("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save app");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-ink/10 bg-white p-12 dark:border-white/5 dark:bg-[#1a1a2e]">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 dark:bg-white/5">
          <Loader2 className="animate-spin text-primary dark:text-secondary" size={20} />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink dark:text-white">{t("loadingReposTitle")}</p>
        <p className="mt-1 text-xs text-ink/40 dark:text-white/40">{t("fetchingRepos")}</p>
      </div>
    );
  }

  if (error.includes("Sign in with GitHub") || error.toLowerCase().includes("github pat not configured") || error.toLowerCase().includes("pat not configured") || error.toLowerCase().includes("github integration is not configured")) {
    const isPatError = error.toLowerCase().includes("pat") || error.toLowerCase().includes("github integration is not configured");
    return (
      <div className="rounded-[1.5rem] border border-dashed border-ink/10 bg-white p-10 text-center dark:border-white/10 dark:bg-[#1a1a2e]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 dark:bg-white/5">
          {isPatError ? <KeyRound className="text-primary dark:text-secondary" size={28} /> : <GitBranch className="text-primary dark:text-secondary" size={28} />}
        </div>
        <h2 className="mt-5 text-xl font-bold text-ink dark:text-white">{isPatError ? t("githubPatRequired") : t("connectGitHubTitle")}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55 dark:text-white/50">
          {isPatError
            ? t("patDescGoogle")
            : t("patAuthDesc")}
        </p>
        {isPatError ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <Link href="/admin/settings/integrations" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 dark:bg-secondary dark:text-ink">
              <KeyRound size={16} /> {t("setGithubPat")}
            </Link>
            <button onClick={() => signIn("github", { callbackUrl: "/admin/apps/new" })} className="text-xs font-semibold text-ink/50 underline dark:text-white/50">
              {t("orContinueWithGithub")}
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("github", { callbackUrl: "/admin/apps/new" })} className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary dark:bg-white dark:text-ink dark:hover:bg-secondary">
            <GitBranch size={16} /> {t("continueWithGithub")}
          </button>
        )}
        <p className="mx-auto mt-4 max-w-sm text-xs text-ink/30 dark:text-white/30">{t("createPatHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Default owner banner — professional */}
      {defaultOwner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Check size={14}/> {t("defaultOwner")}: <span className="font-mono">{defaultOwner}</span>{defaultOwner && <span className="text-emerald-600/60 dark:text-emerald-300/60">{t("autoUsed")}</span>}</p>
          <button onClick={() => setShowManual((v) => !v)} className="text-xs font-semibold text-emerald-700 underline dark:text-emerald-300">{showManual ? t("hideManual") : t("change")}</button>
        </div>
      )}

      {/* Auto-detect failed → manual fallback that becomes new default */}
      {(showManual || error) && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/30 dark:bg-amber-950/20">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300"><GitBranch size={16}/> {t("manualConnectTitle")}</h3>
          <p className="mt-1 text-xs leading-5 text-amber-700/80 dark:text-amber-200/70">Auto-detect {error ? t("autoDetectFailedWithError", { error }) : t("autoDetectFailed")}. Enter owner/repo below — it will be saved as <span className="font-mono font-bold">{t("defaultOwner")}</span> {t("autoUsed")}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-semibold text-ink/60 dark:text-white/60">{t("ownerLabel")}<input value={manualOwner} onChange={(e) => setManualOwner(e.target.value)} placeholder={defaultOwner ?? "kaziweblab"} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1a1a2e] dark:text-white" /></label>
            <label className="text-xs font-semibold text-ink/60 dark:text-white/60">{t("repoLabel")}<input value={manualRepo} onChange={(e) => setManualRepo(e.target.value)} placeholder="kwl-video-downloader" className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1a1a2e] dark:text-white" /></label>
            <div className="flex items-end gap-2">
              <button onClick={saveDefaultOwner} disabled={savingDefault || !manualOwner.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-semibold text-ink border border-ink/10 hover:bg-paper disabled:opacity-50 dark:bg-white/5 dark:text-white dark:border-white/10"><Save size={14}/> {t("saveDefault")}</button>
              <button onClick={addManualRepo} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 text-xs font-bold text-white hover:bg-primary/90 dark:bg-secondary dark:text-ink"><Star size={14}/>{t("add")}</button>
            </div>
          </div>
          {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/20 dark:text-red-300">{error}</p>}
          {saved && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{saved}</p>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight text-ink dark:text-white">{t("repositories")} {defaultOwner && <span className="font-normal text-ink/40 dark:text-white/30">· {defaultOwner}</span>}</h3>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink/50 dark:bg-white/5 dark:text-white/50">{visible.length}</span>
        </div>
        <label className="relative mt-4 block">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30 dark:text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchReposPlaceholder")} className="h-11 w-full rounded-full border border-ink/10 bg-paper pl-10 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/5 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30" />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink/30 hover:bg-ink/5 dark:text-white/30">
              <X size={14} />
            </button>
          )}
        </label>
        <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink/10 bg-paper/50 p-8 text-center dark:border-white/5 dark:bg-white/[0.02]">
              <Search size={20} className="mx-auto text-ink/20 dark:text-white/20" />
              <p className="mt-2 text-sm font-medium text-ink/50 dark:text-white/50">{t("noReposFound")}</p>
            </div>
          ) : (
            visible.map((repo) => (
              <button key={repo.id} onClick={() => selectRepo(repo)} className={`group w-full rounded-2xl border p-4 text-left transition ${selected?.id === repo.id ? "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary dark:border-secondary dark:bg-white/[0.04]" : "border-ink/5 bg-white hover:border-ink/10 hover:bg-paper dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${selected?.id === repo.id ? "bg-primary text-white dark:bg-secondary dark:text-ink" : "bg-paper text-ink/60 group-hover:bg-white dark:bg-white/5 dark:text-white/60"}`}>
                      {repo.private ? <Lock size={14} /> : <GitBranch size={14} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink dark:text-white">{repo.name}</p>
                      <p className="truncate text-xs text-ink/40 dark:text-white/40">{repo.fullName}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${repo.private ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>{repo.private ? t("privateLabel") : t("publicLabel")}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-ink/60 dark:text-white/50">{repo.description ?? t("noDescription")}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-ink/35 dark:text-white/30">
                  <span className="flex items-center gap-1"><Code2 size={11} /> {repo.defaultBranch ?? "main"}</span>
                  <span className="flex items-center gap-1"><Globe size={11} /> {repo.private ? t("privateLabel") : t("publicLabel")}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-ink/10 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1a1a2e]">
        {selected ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <DetectedLogo
                  key={selected.fullName}
                  candidates={logoCandidates(selected.owner, selected.fullName, selected.defaultBranch, (selected.config as { iconUrl?: string } | null)?.iconUrl)}
                  name={selected.name}
                  logoIdx={logoIdx}
                  logoOff={logoOff}
                  onAdvance={() => setLogoIdx((i) => i + 1)}
                  onEmpty={() => setLogoOff(true)}
                />
                <div>
                  <h2 className="text-base font-bold leading-tight text-ink dark:text-white">{selected.name}</h2>
                  <p className="flex items-center gap-1.5 text-xs text-ink/45 dark:text-white/40">{selected.private ? <Lock size={11} /> : <Globe size={11} />} {selected.fullName}</p>
                </div>
              </div>
              <a href={selected.url} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full border border-ink/10 text-ink/40 transition hover:border-primary hover:text-primary dark:border-white/10 dark:text-white/40">
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="mt-5 line-clamp-3 text-sm leading-6 text-ink/60 dark:text-white/60">{selected.description ?? "No repository description provided."}</p>
            <div className="mt-5 flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold text-ink/60 dark:bg-white/5 dark:text-white/50"><GitBranch size={12} /> {selected.defaultBranch}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${selected.private ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"}`}>{selected.private ? <Lock size={12} /> : <Globe size={12} />} {selected.private ? t("privateLabel") : t("publicLabel")}</span>
            </div>
            <div className="mt-6 rounded-2xl border border-ink/5 bg-paper p-4 dark:border-white/5 dark:bg-white/[0.03]">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/30"><Code2 size={12} /> {t("kwlConfig")}</p>
              <p className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${selected.config ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
                <Check size={16} className={selected.config ? "" : "opacity-50"} />{selected.config ? t("detectedReady") : t("notFoundDefaults")}
              </p>
            </div>
            <button onClick={addSelectedRepo} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 dark:bg-secondary dark:text-ink dark:shadow-secondary/20">
              <Star size={16} /> {t("addAppFromRepo")}
            </button>
            {saved && <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{saved}</p>}
            {savedAppId && (
              <Link href={`/admin/apps/${savedAppId}/edit`} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary dark:bg-white dark:text-ink dark:hover:bg-secondary">
                Open {savedAppName || "app"} in editor <ExternalLink size={15} />
              </Link>
            )}
            {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          </>
        ) : (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-paper dark:bg-white/5">
              <GitBranch size={22} className="text-ink/30 dark:text-white/30" />
            </div>
            <p className="mt-4 text-sm font-bold text-ink dark:text-white">{t("selectRepoTitle")}</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-ink/40 dark:text-white/40">{t("selectRepoDesc")}</p>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
