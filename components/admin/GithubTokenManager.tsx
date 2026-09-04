"use client";

import { useEffect, useState } from "react";
import { KeyRound, Eye, EyeOff, Save, Trash2, ShieldCheck, Lock } from "lucide-react";

export function GithubTokenManager() {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<{ hasToken: boolean; masked: string | null; source: string; lastUpdated: string | null; githubUser?: { login: string; name: string | null; avatarUrl: string | null } | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/github/token");
      const text = await res.text();
      const j = text ? (JSON.parse(text) as { hasToken?: boolean; masked?: string | null; source?: string; lastUpdated?: string | null; githubUser?: { login: string; name: string | null; avatarUrl: string | null } | null; error?: string }) : {};
      if (!res.ok) throw new Error(j.error ?? `Failed to load token status (${res.status})`);
      setStatus(j as never);
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Load failed");
      // keep existing status to show Not configured gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!token.trim()) {
      setMessage("Token is required");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/github/token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const text = await res.text();
      const j = text ? (JSON.parse(text) as { masked?: string; error?: string }) : {};
      if (!res.ok) throw new Error(j.error ?? `Save failed (${res.status})`);
      setMessage(`Saved: ${j.masked} (encrypted in DB)`);
      setToken("");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Remove DB token? Will fallback to GITHUB_TOKEN env.")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/github/token", { method: "DELETE" });
      const text = await res.text();
      const j = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) throw new Error(j.error ?? `Delete failed (${res.status})`);
      setMessage("Token removed");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-6 text-sm text-ink/50">Loading token...</div>;

  const canRemove = Boolean(status?.hasToken && status?.source === "database");

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/5 dark:bg-[#1a1a2e]">
      <div className="flex items-center gap-3">
        <KeyRound className="text-primary" size={20} />
        <div>
          <h2 className="font-bold text-ink dark:text-white">GitHub Personal Access Token</h2>
          <p className="text-xs text-ink/50 dark:text-white/50">Private repo access — encrypted at rest, used for /api/github/repos</p>
        </div>
      </div>

      {/* Profile + token card */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10 bg-paper dark:border-white/5 dark:bg-white/[0.03]">
        {status?.hasToken ? (
          <div className="relative p-5">
            {/* Delete icon inside card */}
            <button
              onClick={remove}
              disabled={!canRemove || saving}
              title={canRemove ? "Remove DB token" : status?.source === "env" ? "Env token — remove from .env.local" : "No token"}
              className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border text-xs transition ${canRemove ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400" : "cursor-not-allowed border-ink/10 bg-white text-ink/20 dark:border-white/10 dark:bg-white/5 dark:text-white/20"}`}
            >
              <Trash2 size={14} />
            </button>
            <div className="flex items-center gap-4 pr-10">
              {status.githubUser?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={status.githubUser.avatarUrl} alt={status.githubUser.name ?? status.githubUser.login} className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm dark:border-white/10" />
              ) : (
                <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary dark:bg-white/5 dark:text-white">
                  <ShieldCheck size={22} />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink dark:text-white">{status.githubUser?.name ?? status.githubUser?.login ?? "GitHub Account"}</p>
                {status.githubUser?.login && <p className="truncate text-xs text-ink/50 dark:text-white/50">@{status.githubUser.login}</p>}
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <ShieldCheck size={12} /> Active ({status.source})
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white p-3 dark:bg-white/5">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/30">Token</p>
              <p className="mt-1 font-mono text-xs font-semibold text-ink dark:text-white">{status.masked}</p>
              {status.lastUpdated && <p className="mt-1 text-xs text-ink/40">Last updated: {new Date(status.lastUpdated).toLocaleString()}</p>}
              <p className="mt-1 text-xs text-ink/40">Priority: SystemConfig (DB) &gt; GITHUB_TOKEN env &gt; OAuth token</p>
            </div>
            {status.source === "env" && <p className="mt-3 rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10">Using env GITHUB_TOKEN — remove from .env.local to use DB token</p>}
          </div>
        ) : (
          <div className="p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white dark:bg-white/5">
              <Lock size={18} className="text-ink/30 dark:text-white/30" />
            </span>
            <p className="mt-3 text-sm font-bold text-ink dark:text-white">Not configured</p>
            <p className="mt-1 font-mono text-xs text-ink/40 dark:text-white/40">—</p>
            <p className="mt-2 text-xs text-ink/40">Priority: SystemConfig (DB) &gt; GITHUB_TOKEN env &gt; OAuth token</p>
            <p className="mt-1 text-xs text-amber-700/70 dark:text-amber-300/70">Add a PAT below to enable private repos.</p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <label className="text-sm font-semibold text-ink dark:text-white">New PAT (ghp_ or github_pat_)</label>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <input type={show ? "text" : "password"} value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" className="h-11 w-full rounded-xl border border-ink/10 bg-white px-4 pr-10 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink/40 hover:bg-paper dark:text-white/40">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            <Save size={16} /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <p className="mt-2 text-xs text-ink/40">Create at GitHub → Settings → Developer settings → Personal access tokens (classic) with repo scope.</p>
      </div>

      {/* Secondary remove row — disabled when no DB token */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={remove}
          disabled={!canRemove || saving}
          title={!canRemove ? "No DB token to remove" : undefined}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${canRemove ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400" : "cursor-not-allowed border-ink/10 bg-paper text-ink/30 dark:border-white/5 dark:bg-white/5 dark:text-white/30"}`}
        >
          <Trash2 size={14} /> Remove DB token
        </button>
        {!canRemove && <span className="self-center text-xs text-ink/30 dark:text-white/30">{status?.hasToken ? "Env token active" : "No token"}</span>}
      </div>

      {message && <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-sm dark:bg-white/5 dark:text-white">{message}</p>}
    </div>
  );
}
