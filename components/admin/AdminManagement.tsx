"use client";

import { useEffect, useState } from "react";
import { Shield, ShieldCheck, Trash2, Crown, Mail, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";

type AdminRow = {
  _id: string;
  email: string;
  name?: string | null;
  role: "admin" | "superadmin";
  isEnv?: boolean;
  createdAt?: string | null;
};

export function AdminManagement() {
  const { t } = useLanguage();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmRemoveEmail, setConfirmRemoveEmail] = useState<string | null>(null);

  async function fetchAdmins() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("failedToLoadAdmins"));
      setAdmins(data.data ?? []);
      setCurrentEmail((data.currentEmail as string) ?? null);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t("loadFailed") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setActionLoading("add");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("addFailed"));
      setMessage({ type: "success", text: t("adminAddedAs", { email: data.data.email }) });
      setEmailInput("");
      fetchAdmins();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t("addFailed") });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(email: string) {
    setConfirmRemoveEmail(email);
    return;
  }
  async function confirmRemove() {
    const email = confirmRemoveEmail;
    if (!email) return;
    setActionLoading(email + "-remove");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("removeFailed"));
      setMessage({ type: "success", text: t("adminRemoved", { email }) });
      fetchAdmins();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t("removeFailed") });
    } finally {
      setActionLoading(null);
      setConfirmRemoveEmail(null);
    }
  }

  async function handleToggleSuper(email: string) {
    setActionLoading(email + "-toggle");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || t("toggleFailed"));
      setMessage({ type: "success", text: t("adminNowRole", { email, role: data.data.role }) });
      fetchAdmins();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : t("toggleFailed") });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="py-12 text-center text-ink/50 dark:text-white/50">{t("loadingAdmins")}</div>;

  const currentRow = admins.find((a) => a.email.toLowerCase() === (currentEmail ?? "").toLowerCase());
  const isCurrentSuperAdmin = currentRow?.role === "superadmin";

  return (
    <div className="space-y-6">
      {/* Add form - visible only to system super admins; normal admins/users cannot see this section */}
      {isCurrentSuperAdmin && (
        <div className="rounded-2xl border border-ink/10 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <h2 className="flex items-center gap-2 font-bold text-ink dark:text-white">
            <Shield className="text-primary" size={18} /> {t("addNewAdmin")}
          </h2>
          <p className="mt-1 text-sm text-ink/50 dark:text-white/60">{t("onlySuperAdminsCanAddDesc")}</p>
          <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 dark:border-white/10 dark:bg-white/5">
              <Mail size={16} className="text-ink/40" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="newadmin@example.com"
                className="w-full bg-transparent py-3 text-sm outline-none dark:text-white dark:placeholder:text-white/40"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading === "add"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
            >
              {actionLoading === "add" ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {t("addNewAdmin")}
            </button>
          </form>
        </div>
      )}

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/5">
        <div className="border-b border-ink/10 p-5 dark:border-white/10">
          <h2 className="font-bold text-ink dark:text-white">{t("adminRoster")}</h2>
          <p className="mt-1 text-sm text-ink/45 dark:text-white/60">{t("adminRosterDesc")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-widest text-ink/40 dark:bg-white/5 dark:text-white/50">
              <tr>
                <th className="px-5 py-4">{t("thAdmin")}</th>
                <th className="px-5 py-4">{t("thRole")}</th>
                <th className="px-5 py-4">{t("thSource")}</th>
                <th className="px-5 py-4">{t("thActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10 dark:divide-white/10">
              {admins.map((admin) => {
                const isSelf = admin.email.toLowerCase() === (currentEmail ?? "").toLowerCase();
                const isEnv = Boolean(admin.isEnv);
                const disable = isSelf || isEnv;
                return (
                  <tr key={admin.email} className={isSelf ? "bg-amber-50/50 dark:bg-amber-500/10" : "dark:bg-transparent"}>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink dark:text-white">
                        {admin.email} {isSelf && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-400/20 dark:text-amber-200">{t("youBadge")}</span>}
                      </p>
                      <p className="mt-1 text-xs text-ink/45 dark:text-white/50">{admin.name ?? admin.email.split("@")[0]}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          admin.role === "superadmin" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
                        }`}
                      >
                        {admin.role === "superadmin" ? <Crown size={12} /> : <Shield size={12} />}
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Tooltip content={isEnv ? t("systemManagedDesc") : ""} side="top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isEnv
                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/20"
                              : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-white/60 dark:ring-white/10"
                          }`}
                        >
                          {isEnv ? <ShieldCheck size={12} /> : <Shield size={12} />}
                          {isEnv ? t("envSource") : t("databaseSource")}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Tooltip content={disable ? (isSelf ? t("cannotToggleSelf") : t("envAdminManagedViaEnv")) : t("toggleSuperAdmin")}>
                          <button
                            onClick={() => handleToggleSuper(admin.email)}
                            disabled={disable || actionLoading === admin.email + "-toggle"}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                          >
                            {actionLoading === admin.email + "-toggle" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Crown size={14} />
                            )}
                            {admin.role === "superadmin" ? t("demote") : t("makeSuper")}
                          </button>
                        </Tooltip>
                        <Tooltip content={disable ? (isSelf ? t("cannotRemoveSelf") : t("envAdminCannotBeRemoved")) : t("removeAdminTitle")}>
                          <button
                            onClick={() => handleRemove(admin.email)}
                            disabled={disable || actionLoading === admin.email + "-remove"}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25"
                          >
                            {actionLoading === admin.email + "-remove" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            {t("remove")}
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-ink/40 dark:text-white/40">
                    {t("noAdminsFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmRemoveEmail}
        title={confirmRemoveEmail ? t("confirmRemoveAdmin", { email: confirmRemoveEmail }) : ""}
        description={t("confirmDeleteDesc")}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        variant="danger"
        icon="trash"
        loading={confirmRemoveEmail ? actionLoading === confirmRemoveEmail + "-remove" : false}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setConfirmRemoveEmail(null)}
      />
    </div>
  );
}
