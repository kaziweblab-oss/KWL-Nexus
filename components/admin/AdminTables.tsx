"use client";

import { Pencil, Plus, Search, Trash2, Video, X, Mail, Calendar, Shield, Ban, Check, Boxes, Settings2, AlertTriangle, Send } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { Tooltip } from "@/components/ui/Tooltip";

type AdminApp = { _id: string; name: string; category: string; latestVersion?: string | null; isPublished: boolean; isNewRelease?: boolean; slug: string };

type UserRow = { _id?: string; name: string; email: string; status: string; joined: string; role?: string; image?: string | null; phone?: string | null; createdAt?: string | null };

type AdminAppRow = { _id: string; slug?: string; name: string; category: string; iconUrl?: string | null; isPublished: boolean };

const fallbackUsers: UserRow[] = [{ name: "Ayesha Rahman", email: "ayesha@example.com", status: "Active", joined: "Aug 24, 2026" }, { name: "Tanvir Hasan", email: "tanvir@example.com", status: "Active", joined: "Aug 22, 2026" }, { name: "Maya Chen", email: "maya@example.com", status: "Blocked", joined: "Aug 19, 2026" }];

export function AppManagement() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [rows, setRows] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/apps", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load apps");
      const j = await res.json();
      setRows(Array.isArray(j.data) ? j.data : []);
    } catch {
      showToast("Unable to load apps", "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this app?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/apps?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setRows((prev) => prev.filter((a) => a._id !== id));
      showToast("App deleted", "success");
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch {
      showToast("Delete failed", "error");
    }
    setDeleting(null);
  }

  return <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/5 dark:bg-[#1a1a2e]"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/10 p-5 dark:border-white/5"><div><h2 className="font-bold text-ink dark:text-white">{t("appLibrary")}</h2><p className="mt-1 text-sm text-ink/45 dark:text-white/40">{t("managePublishedDesc")}</p></div><div className="flex items-center gap-3"><Link href="/admin/apps/new" className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 dark:bg-secondary dark:text-ink dark:hover:bg-secondary/90"><Plus size={16} /> {t("addFromGitHub")}</Link></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-paper text-xs uppercase tracking-widest text-ink/40 dark:bg-white/5 dark:text-white/40"><tr><th className="px-5 py-4">{t("thApp")}</th><th className="px-5 py-4">{t("thCategory")}</th><th className="px-5 py-4">{t("thVersion")}</th><th className="px-5 py-4">{t("thStatus")}</th><th className="px-5 py-4" /></tr></thead><tbody className="divide-y divide-ink/10 dark:divide-white/5">{loading ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-ink/40 dark:text-white/40">{t("loadingApps")}</td></tr> : rows.length === 0 ? <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-ink/40 dark:text-white/40">{t("noAppsFound")}</td></tr> : rows.map((app) => <tr key={app._id} className="text-ink/65 dark:text-white/60"><td className="px-5 py-4 font-semibold text-ink dark:text-white">{app.name}</td><td className="px-5 py-4">{app.category}</td><td className="px-5 py-4">{app.latestVersion ? `v${app.latestVersion}` : "—"}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${app.isPublished ? "bg-[#e5f8f1] text-[#159570] dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>{app.isPublished ? t("published") : t("draft")}</span></td><td className="flex gap-2 px-5 py-4"><Link href={`/admin/apps/${app._id}/edit`} aria-label={`Edit ${app.name}`} title="Edit" className="grid h-8 w-8 place-items-center rounded-lg text-ink/40 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary hover:shadow-sm hover:-translate-y-0.5 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"><Pencil size={16} /></Link><Link href={`/admin/apps/${app._id}/edit`} aria-label={`Manage tutorial for ${app.name}`} title="Manage tutorial" className="grid h-8 w-8 place-items-center rounded-lg text-ink/40 transition-all duration-200 hover:scale-110 hover:bg-primary/10 hover:text-primary hover:shadow-sm hover:-translate-y-0.5 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"><Video size={16} /></Link><button aria-label={`Delete ${app.name}`} title="Delete" disabled={deleting === app._id} onClick={() => remove(app._id)} className="grid h-8 w-8 place-items-center rounded-lg text-ink/40 transition-all duration-200 hover:scale-110 hover:bg-red-500/10 hover:text-red-500 hover:shadow-sm hover:-translate-y-0.5 dark:text-white/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></div>;
}

export function UserManagement() {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>(fallbackUsers);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [detail, setDetail] = useState<{ role?: string; isBlocked?: boolean; blockedApps?: string[] } | null>(null);
  const [editRole, setEditRole] = useState("user");
  const [subs, setSubs] = useState<Array<{ _id: string; status: string; plan?: { appId?: string; appSlug?: string; slug?: string; name?: string } }>>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [manageMsg, setManageMsg] = useState("");
  const { showToast } = useToast();
  const [blockModal, setBlockModal] = useState<{ type: "all" | "app"; appId?: string } | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [realApps, setRealApps] = useState<AdminAppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("fallback");
        const data = await res.json();
        if (active && Array.isArray(data.data) && data.data.length) {
          const mapped: UserRow[] = data.data.map((u: { name?: string; email: string; role?: string; createdAt?: string; image?: string; phone?: string }) => ({
            _id: u.email,
            name: u.name || u.email.split("@")[0],
            email: u.email,
            status: u.role === "superadmin" ? "Super Admin" : u.role === "admin" ? "Admin" : "Active",
            joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
            role: u.role,
            image: u.image,
            phone: u.phone,
          }));
          setUsers(mapped);
        }
      } catch {
        // keep fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/user/is-admin").then((r) => r.json()).then((d) => { if (active) setIsSuperAdmin(Boolean(d?.isSuperAdmin)); }).catch(() => { if (active) setIsSuperAdmin(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    async function loadApps() {
      setAppsLoading(true);
      try {
        const res = await fetch("/api/admin/apps", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (active && Array.isArray(j.data)) setRealApps(j.data);
        }
      } catch {}
      if (active) setAppsLoading(false);
    }
    loadApps();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selected) { setDetail(null); setSubs([]); return; }
    const sel = selected;
    setEditRole(sel.role ?? "user");
    setDetail({ role: sel.role ?? "user" });
    let cancelled = false;
    async function loadDetail() {
      setSubsLoading(true);
      setManageMsg("");
      try {
        const [uRes, sRes] = await Promise.all([
          fetch(`/api/admin/users/${encodeURIComponent(sel.email)}`),
          fetch(`/api/admin/users/${encodeURIComponent(sel.email)}/subscriptions`),
        ]);
        if (!cancelled && uRes.ok) {
          const j = await uRes.json();
          if (j.data) { setDetail(j.data); setEditRole(j.data.role ?? sel.role ?? "user"); }
          else { setDetail({ role: sel.role ?? "user" }); }
        }
        if (!cancelled && sRes.ok) {
          const j = await sRes.json();
          setSubs(Array.isArray(j.data) ? j.data : []);
        }
      } catch {}
      if (!cancelled) setSubsLoading(false);
    }
    loadDetail();
    return () => { cancelled = true; };
  }, [selected]);

  const filtered = users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));

  async function saveRole() {
    if (!selected) return;
    const selEmail = selected.email;
    setActionLoading("role");
    setManageMsg("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: editRole }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setDetail((d) => ({ ...(d ?? {}), role: editRole }));
      setUsers((prev) => prev.map((u) => (u.email === selEmail ? { ...u, role: editRole, status: editRole === "superadmin" ? "Super Admin" : editRole === "admin" ? "Admin" : "Active" } : u)));
      setSelected((p) => p ? { ...p, role: editRole } : p);
      setManageMsg("Role updated");
      showToast(`Role updated to ${editRole}`, "success");
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed"; setManageMsg(msg); showToast(msg, "error"); }
    setActionLoading(null);
  }
  async function toggleBlockAll() {
    if (!selected) return;
    const next = !detail?.isBlocked;
    if (next) {
      setBlockReason("");
      setBlockModal({ type: "all" });
      return;
    }
    const selEmail = selected.email;
    setActionLoading("blockAll");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: next }) });
      const j = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed");
      setDetail((d) => ({ ...(d ?? {}), isBlocked: next }));
      setManageMsg("User unblocked");
      showToast("User unblocked", "success");
      window.dispatchEvent(new Event("notifications-refresh"));
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed"; setManageMsg(msg); showToast(msg, "error"); }
    setActionLoading(null);
  }
  async function confirmBlockAll() {
    if (!selected || !blockModal) return;
    const selEmail = selected.email;
    setActionLoading("blockAll");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: true, reason: blockReason.trim() }) });
      const j = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed to block");
      setDetail((d) => ({ ...(d ?? {}), isBlocked: true }));
      setManageMsg("User blocked from all apps");
      showToast(`Blocked ${selected.name}: ${blockReason.trim() || "No reason"}`, "warning");
      window.dispatchEvent(new Event("notifications-refresh"));
      setBlockModal(null); setBlockReason("");
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed"; setManageMsg(msg); showToast(msg, "error"); }
    setActionLoading(null);
  }
  async function toggleAppBlock(appId: string) {
    if (!selected) return;
    const isBlocked = detail?.blockedApps?.includes(appId);
    if (!isBlocked) {
      setBlockReason("");
      setBlockModal({ type: "app", appId });
      return;
    }
    const selEmail = selected.email;
    setActionLoading(`block-${appId}`);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, action: "unblock" }) });
      if (!res.ok) throw new Error();
      setDetail((d) => {
        const cur = d?.blockedApps ?? [];
        return { ...(d ?? {}), blockedApps: cur.filter((x) => x !== appId) };
      });
      setManageMsg(`Unblocked ${appId}`);
      showToast(`Unblocked ${appId}`, "success");
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch { setManageMsg("Failed"); showToast("Failed", "error"); }
    setActionLoading(null);
  }
  async function confirmAppBlock() {
    if (!selected || !blockModal?.appId) return;
    const appId = blockModal.appId;
    const selEmail = selected.email;
    setActionLoading(`block-${appId}`);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, action: "block", reason: blockReason.trim() }) });
      const j = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) throw new Error((j as { error?: string }).error || "Failed to block");
      setDetail((d) => {
        const cur = d?.blockedApps ?? [];
        return { ...(d ?? {}), blockedApps: [...cur, appId] };
      });
      setManageMsg(`Blocked ${appId}`);
      showToast(`Blocked ${appId}: ${blockReason.trim() || "No reason"}`, "warning");
      window.dispatchEvent(new Event("notifications-refresh"));
      setBlockModal(null); setBlockReason("");
    } catch (e) { const msg = e instanceof Error ? e.message : "Failed"; setManageMsg(msg); showToast(msg, "error"); }
    setActionLoading(null);
  }
  function matchSubForApp(s: { plan?: { appId?: string; appSlug?: string; slug?: string; name?: string }; appId?: string }, app: AdminAppRow) {
    const ids = [app.slug, app._id].filter(Boolean) as string[];
    const plan = s.plan as { appId?: string; appSlug?: string; slug?: string } | undefined;
    return (plan?.appId && ids.includes(plan.appId)) || (plan?.appSlug && ids.includes(plan.appSlug)) || (plan?.slug && ids.includes(plan.slug)) || (s.appId && ids.includes(s.appId));
  }
  async function toggleAppSub(app: AdminAppRow, activate: boolean) {
    if (!selected) return;
    const selEmail = selected.email;
    const appId = (app.slug || app._id) as string;
    setActionLoading(`sub-${appId}`);
    try {
      const existing = subs.find((s) => matchSubForApp(s, app));
      if (activate) {
        if (existing) {
          const res = await fetch(`/api/admin/subscriptions/${existing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) });
          if (!res.ok) throw new Error();
        } else {
          const res = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}/subscriptions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId, status: "active" }) });
          if (!res.ok) throw new Error();
        }
      } else {
        if (existing) {
          const res = await fetch(`/api/admin/subscriptions/${existing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) });
          if (!res.ok) throw new Error();
        }
      }
      const sRes = await fetch(`/api/admin/users/${encodeURIComponent(selEmail)}/subscriptions`);
      const j = await sRes.json();
      setSubs(Array.isArray(j.data) ? j.data : []);
      setManageMsg(activate ? "Activated" : "Deactivated");
      showToast(activate ? "Subscription activated" : "Subscription deactivated", activate ? "success" : "warning");
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch { setManageMsg("Failed"); showToast("Action failed", "error"); }
    setActionLoading(null);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/5 dark:bg-[#1a1a2e]">
        <div className="flex flex-col gap-4 border-b border-ink/10 p-5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-ink dark:text-white">All users</h2><p className="mt-1 text-sm text-ink/45 dark:text-white/40">Review members and account access.</p></div>
          <label className="relative"><span className="sr-only">Search users</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-white/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users..." className="h-10 rounded-xl bg-paper pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30" /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-widest text-ink/40 dark:bg-white/5 dark:text-white/40"><tr><th className="px-5 py-4">User</th><th className="px-5 py-4">Joined</th><th className="px-5 py-4">{t("thStatus")}</th><th className="px-5 py-4">Action</th></tr></thead>
            <tbody className="divide-y divide-ink/10 dark:divide-white/5">
              {loading && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-ink/40 dark:text-white/40">Loading users...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-ink/40 dark:text-white/40">No users found</td></tr>}
              {!loading && filtered.map((user) => <tr key={user.email} className="hover:bg-paper/50 dark:hover:bg-white/5"><td className="px-5 py-4"><p className="font-semibold text-ink dark:text-white">{user.name}</p><p className="mt-1 text-xs text-ink/45 dark:text-white/40">{user.email}</p></td><td className="px-5 py-4 text-ink/55 dark:text-white/50">{user.joined}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.status === "Blocked" ? "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-300" : user.status.includes("Admin") ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300" : "bg-[#e5f8f1] text-[#159570] dark:bg-emerald-500/10 dark:text-emerald-300"}`}>{user.status}</span></td><td className="px-5 py-4"><button onClick={() => setSelected(user)} className="rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white dark:border-secondary/20 dark:bg-secondary/10 dark:text-secondary dark:hover:bg-secondary dark:hover:text-ink">View details</button></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-sm dark:bg-black/60" onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-ink/10 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <div className="flex items-start justify-between border-b border-ink/10 p-6 dark:border-white/5">
              <div className="flex gap-4">
                <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-primary text-white shrink-0">
                  {selected.image ? <img src={selected.image} alt={selected.name} className="h-full w-full object-cover rounded-full" /> : selected.name.slice(0,2).toUpperCase()}
                </span>
                <div>
                  <h3 className="font-bold text-ink dark:text-white">{selected.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/50 dark:text-white/50"><Mail size={12}/> {selected.email}</p>
                  {selected.phone && <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{selected.phone}</p>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 hover:bg-red-500 hover:text-white dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500 dark:hover:text-white transition"><X size={16}/></button>
            </div>
            <div className="grid gap-3 p-6 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 dark:bg-white/5"><span className="flex items-center gap-2 text-ink/50 dark:text-white/50"><Calendar size={14}/> Joined</span><span className="font-semibold text-ink dark:text-white">{selected.joined}</span></div>
              <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 dark:bg-white/5"><span className="flex items-center gap-2 text-ink/50 dark:text-white/50"><Shield size={14}/> Status</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${detail?.isBlocked ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>{detail?.isBlocked ? "Blocked (all apps)" : selected.status}</span></div>
              <div className="rounded-xl bg-paper p-4 dark:bg-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40 flex items-center gap-1"><Settings2 size={12}/> Manage user</p>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center justify-between gap-3 text-sm">Role
                    <span className="flex items-center gap-2">
                      <CustomSelect value={editRole} onChange={setEditRole} options={[{value:"user",label:"User"},{value:"admin",label:"Admin"},{value:"superadmin",label:"Superadmin"}]} className="min-w-[140px]" disabled={!isSuperAdmin} />
                      <Tooltip content={!isSuperAdmin ? t("onlySuperAdminsCanAddDesc") : ""}>
                        <button disabled={!isSuperAdmin || actionLoading==="role"} onClick={saveRole} className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed transition">{actionLoading==="role"?t("saving"):"Save"}</button>
                      </Tooltip>
                    </span>
                  </label>
                  {!isSuperAdmin && <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"><AlertTriangle size={10}/> Only superadmin can promote/demote</p>}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink/70 dark:text-white/70 flex items-center gap-1"><Ban size={12}/> Block all apps</span>
                    <button disabled={actionLoading==="blockAll"} onClick={toggleBlockAll} className={`rounded-full border px-5 py-2 text-sm font-bold shadow-sm transition ${detail?.isBlocked?"bg-red-500 border-red-500 text-white hover:bg-red-600 hover:shadow-md":"bg-white border-ink/10 text-ink hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-sm dark:bg-white/10 dark:text-white dark:border-white/10 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30"}`}>{detail?.isBlocked?"Unblock":"Block"}</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-ink/40 dark:text-white/40 flex items-center gap-1"><Boxes size={12}/> All apps — plan subscription & block</p>
              {appsLoading ? <p className="mt-3 text-sm text-ink/50">Loading apps...</p> : subsLoading ? <p className="mt-3 text-sm text-ink/50">Loading...</p> : realApps.length === 0 ? <p className="mt-3 text-sm text-ink/50">No apps found.</p> : (
                <div className="mt-3 grid gap-2">
                  {realApps.map((app)=>{
                    const appId = (app.slug || app._id) as string;
                    const sub = subs.find((s)=> s.plan?.appId===appId || s.plan?.appSlug===appId || (s.plan?.slug as string)?.includes(appId) || s.plan?.appSlug===app.slug || s.plan?.appId===app._id || s.plan?.appId===app.slug);
                    const isBlockedApp = detail?.blockedApps?.includes(appId) || detail?.blockedApps?.includes(app._id) || detail?.blockedApps?.includes(app.slug || "");
                    const isActive = sub?.status==="active" && !isBlockedApp && !detail?.isBlocked;
                    const planName = sub?.plan?.name || "No plan";
                    return (
                      <div key={app._id} className="flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-paper p-3 dark:border-white/10 dark:bg-white/5">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink dark:text-white"><span className="grid h-6 w-6 place-items-center overflow-hidden rounded-md text-xs text-white" style={{backgroundColor:"#6C63FF"}}>{app.iconUrl ? <img src={app.iconUrl} alt="" className="h-full w-full object-cover" /> : app.name.slice(0,1).toUpperCase()}</span>{app.name}</p>
                          <p className="mt-0.5 text-xs text-ink/50 dark:text-white/50">{sub ? `${planName} · ${sub.status}` : "No plan"} {isBlockedApp&&"· Blocked"} {detail?.isBlocked&&"· All blocked"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Tooltip content={isBlockedApp ? "Unblock app" : "Block app"}>
                            <button disabled={actionLoading===`block-${appId}`} onClick={()=>toggleAppBlock(appId)} className={`inline-flex min-w-[72px] justify-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${isBlockedApp?"bg-red-500 border-red-500 text-white hover:bg-red-600":"bg-ink/10 border-transparent text-ink/60 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30"}`}>{isBlockedApp?"Unblock":"Block"}</button>
                          </Tooltip>
                          {isActive ? (
                            <button disabled={actionLoading===`sub-${appId}`} onClick={()=>toggleAppSub(app,false)} className="inline-flex min-w-[104px] justify-center whitespace-nowrap items-center gap-1 rounded-full bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"><Ban size={10}/> Deactivate</button>
                          ) : (
                            <button disabled={actionLoading===`sub-${appId}`} onClick={()=>toggleAppSub(app,true)} className="inline-flex min-w-[92px] justify-center whitespace-nowrap items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Check size={10}/> Activate</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {manageMsg && <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">{manageMsg}</p>}
              {detail?.isBlocked && <p className="mt-2 flex items-center gap-1 text-xs text-red-500"><AlertTriangle size={10}/> User is blocked from all apps</p>}
            </div>

            <div className="flex gap-3 p-6 pt-4">
              <button onClick={() => setSelected(null)} className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 hover:text-white dark:bg-white dark:text-ink dark:hover:bg-red-500 dark:hover:text-white shadow-sm hover:shadow-md transition">Close</button>
              <a href={`mailto:${selected.email}`} className="flex-1 rounded-xl border border-ink/10 px-4 py-3 text-center text-sm font-semibold text-ink hover:bg-paper dark:border-white/10 dark:text-white dark:hover:bg-white/5">Email user</a>
            </div>
          </div>
        </div>
      )}

      {blockModal && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/60 p-4 backdrop-blur-sm dark:bg-black/60" onClick={() => setBlockModal(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <h3 className="font-bold text-ink dark:text-white flex items-center gap-2"><Ban size={16} className="text-red-500"/> {blockModal.type === "all" ? "Block all apps" : `Block ${blockModal.appId}`}</h3>
            <p className="mt-1 text-xs text-ink/50 dark:text-white/50">Why is this user being blocked? This reason will be sent as notification to the user.</p>
            <textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g., Violation of terms, payment fraud..." rows={4} className="mt-3 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 bg-paper p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" autoFocus />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setBlockModal(null)} className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-white/5 dark:text-white">Cancel</button>
              <button onClick={() => blockModal.type === "all" ? confirmBlockAll() : confirmAppBlock()} disabled={actionLoading?.startsWith("block")} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"><Send size={14}/> Confirm block</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
