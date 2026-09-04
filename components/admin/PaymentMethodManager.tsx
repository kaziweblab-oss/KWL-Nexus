"use client";

import { useEffect, useState } from "react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { useToast } from "@/components/ui/Toast";
import { CreditCard, Plus, Pencil, Trash2, Save, X, Globe, ArrowUp, ArrowDown, Eye, EyeOff, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";

type Method = {
  _id: string;
  name: string;
  slug: string;
  type: "manual" | "gateway";
  provider: string;
  accountNumber: string;
  instructions: string;
  qrImageUrl: string;
  enabled: boolean;
  order: number;
  icon: string;
  gatewayConfig: Record<string, unknown>;
  status?: string;
  health?: {
    status?: string;
    lastChecked?: string | null;
    lastSuccessAt?: string | null;
    lastFailedAt?: string | null;
    latencyMs?: number | null;
    error?: string | null;
    errorCode?: string | null;
    consecutiveFailures?: number;
    checkVersion?: number;
    requestId?: string | null;
  };
  lastCheckedAt?: string | null;
};

const emptyForm: Omit<Method, "_id"> = {
  name: "",
  slug: "",
  type: "manual",
  provider: "",
  accountNumber: "",
  instructions: "",
  qrImageUrl: "",
  enabled: true,
  order: 0,
  icon: "",
  gatewayConfig: {},
};

const providers = [
  { value: "", label: "None / Manual" },
  { value: "bkash", label: "bKash (manual)" },
  { value: "nagad", label: "Nagad (manual)" },
  { value: "rocket", label: "Rocket (manual)" },
  { value: "stripe", label: "Stripe (gateway)" },
  { value: "sslcommerz", label: "SSLCommerz (gateway)" },
  { value: "paypal", label: "PayPal (gateway)" },
  { value: "custom", label: "Custom gateway" },
];

function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none" } as const;
  switch (provider) {
    case "bkash": return <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#E2136E] text-white text-[10px] font-bold">bK</span>;
    case "nagad": return <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F15A29] text-white text-[10px] font-bold">N</span>;
    case "rocket": return <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#8A2BE2] text-white text-[10px] font-bold">R</span>;
    case "stripe": return <svg {...common} viewBox="0 0 24 24"><path d="M13.98 6.5c0 1.05-.54 1.67-1.6 1.67h-1.2V4.9h1.16c1.02 0 1.64.58 1.64 1.6zM11.18 9.3h1.32c1.12 0 1.86.62 1.86 1.82 0 1.22-.75 1.96-1.96 1.96h-1.22V9.3z" fill="#635BFF" /></svg>;
    case "sslcommerz": return <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#00A651] text-white text-[10px] font-bold">S</span>;
    case "paypal": return <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#003087] text-white text-[10px] font-bold">P</span>;
    case "custom": return <Globe size={size} className="text-primary" />;
    default: return <Globe size={size} className="text-ink/40" />;
  }
}
function providerBg(provider: string) {
  const map: Record<string, string> = {
    bkash: "bg-[#E2136E]/10 text-[#E2136E]",
    nagad: "bg-[#F15A29]/10 text-[#F15A29]",
    rocket: "bg-[#8A2BE2]/10 text-[#8A2BE2]",
    stripe: "bg-[#635BFF]/10 text-[#635BFF]",
    sslcommerz: "bg-[#00A651]/10 text-[#00A651]",
    paypal: "bg-[#003087]/10 text-[#003087]",
    custom: "bg-primary/10 text-primary",
  };
  return map[provider] ?? "bg-paper text-ink/60 dark:bg-white/10 dark:text-white/60";
}

export function PaymentMethodManager() {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [gatewayJson, setGatewayJson] = useState("{}");
  const [gatewayPairs, setGatewayPairs] = useState<Array<{ key: string; value: string; visible: boolean }>>([]);
  const [newPairKey, setNewPairKey] = useState("");
  const [newPairValue, setNewPairValue] = useState("");
  const [newPairVisible, setNewPairVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Method | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payment-methods", { cache: "no-store" });
      const j = await res.json();
      if (res.ok) {
        const data: Method[] = Array.isArray(j.data) ? j.data : [];
        setMethods(data);
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  // Realtime-style refresh via existing polling/event pattern (reuse NotificationBell pattern, no WebSocket)
  useEffect(() => {
    const id = setInterval(() => { void load(); }, 30000);
    const onFocus = () => void load();
    const onRefresh = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("notifications-refresh", onRefresh as EventListener);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("notifications-refresh", onRefresh as EventListener);
    };
  }, []);

  // sync pairs from gatewayJson / form.gatewayConfig
  useEffect(() => {
    try {
      const obj = gatewayJson.trim() ? JSON.parse(gatewayJson) : {};
      const pairs = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v ?? ""), visible: false }));
      setGatewayPairs(pairs);
    } catch {}
  }, [gatewayJson]);

  // auto-set key from provider for gateway config — key always disabled, value enables when provider selected
  useEffect(() => {
    if (form.type === "gateway" && form.provider) {
      const keyMap: Record<string, string> = { stripe: "apiKey", sslcommerz: "storeId", paypal: "clientId", custom: "apiKey" };
      const suggested = keyMap[form.provider] || "apiKey";
      if (!newPairKey) setNewPairKey(suggested);
      else if (newPairKey === form.provider) setNewPairKey(suggested);
    }
  }, [form.provider, form.type]);

  useEffect(() => {
    // when editingId changes, sync pairs from form.gatewayConfig is handled via gatewayJson effect
    if (modalOpen) {
      try {
        const obj = JSON.parse(gatewayJson || "{}");
        const pairs = Object.entries(obj).map(([k, v]) => ({ key: k, value: String(v ?? ""), visible: false }));
        setGatewayPairs(pairs);
      } catch {}
    }
  }, [modalOpen]);

  function openCreate() {
    const nextOrder = methods.length ? Math.max(...methods.map((m) => m.order)) + 1 : 0;
    setForm({ ...emptyForm, order: nextOrder });
    setGatewayJson("{}");
    setEditingId(null);
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(m: Method) {
    setForm({ name: m.name, slug: m.slug, type: m.type, provider: m.provider, accountNumber: m.accountNumber, instructions: m.instructions, qrImageUrl: m.qrImageUrl ?? "", enabled: m.enabled, order: m.order, icon: m.icon, gatewayConfig: m.gatewayConfig ?? {} });
    setGatewayJson(JSON.stringify(m.gatewayConfig ?? {}, null, 2));
    setEditingId(m._id);
    setMessage("");
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    let parsedConfig: Record<string, unknown> = {};
    if (form.type === "gateway") {
      try {
        parsedConfig = gatewayJson.trim() ? JSON.parse(gatewayJson) : {};
      } catch {
        setMessage(t("gatewayJsonInvalid"));
        return;
      }
    }
    if (!form.name.trim() || !form.slug.trim()) { setMessage(t("nameSlugRequired")); return; }
    if (!/^[a-z0-9_-]+$/.test(form.slug.toLowerCase())) { setMessage(t("slugPattern")); return; }

    setSaving(true);
    try {
      const payload = { ...form, slug: form.slug.toLowerCase(), gatewayConfig: parsedConfig };
      const url = editingId ? `/api/admin/payment-methods/${editingId}` : "/api/admin/payment-methods";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) { const msg = j.error ?? "Failed to save"; setMessage(msg); toastError(msg); return; }
      setModalOpen(false);
      if (editingId) success(t("paymentMethodUpdated")); else success(t("paymentMethodAdded"));
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  async function toggleEnabled(m: Method) {
    // Backend guard: gateway must be ACTIVE/HEALTHY, manual (bKash/Nagad/Rocket) auto-HEALTHY — no check needed
    if (!m.enabled && m.type !== "manual") {
      const isHealthy = m.status === "ACTIVE" && m.health?.status === "HEALTHY";
      if (!isHealthy) {
        toastError(t("checkFailed"));
        return;
      }
    }
    const latest = methods.find((x) => x._id === m._id) ?? m;
    const nextEnabled = !latest.enabled;
    setMethods((prev) => prev.map((x) => (x._id === latest._id ? { ...x, enabled: nextEnabled } : x)));
    try {
      const res = await fetch(`/api/admin/payment-methods/${latest._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: nextEnabled }) });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const j = await res.json().catch(() => ({} as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!res.ok) throw new Error((j as any).error || "Failed to toggle");
      success(nextEnabled ? `${t("paymentMethodUpdated")} - On` : `${t("paymentMethodUpdated")} - Off`);
      window.dispatchEvent(new Event("notifications-refresh"));
      await load();
    } catch (e) {
      setMethods((prev) => prev.map((x) => (x._id === latest._id ? { ...x, enabled: latest.enabled } : x)));
      toastError(e instanceof Error ? e.message : "Failed to toggle");
    }
  }
  async function checkValidity(m: Method) {
    setChecking(m._id);
    try {
      const res = await fetch(`/api/admin/payment-methods/${m._id}/check`, { method: "POST" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Health check failed");
      // Update local method with new status from backend
      const updated = j.data as Method;
      if (updated) {
        setMethods((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
      } else {
        await load();
      }
      if (j.health?.status === "HEALTHY" || j.data?.health?.status === "HEALTHY" || j.data?.status === "ACTIVE") {
        success(t("checkSuccess"));
      } else {
        toastError(j.health?.error ? `${t("checkFailed")}: ${j.health.error}` : t("checkFailed"));
      }
      window.dispatchEvent(new Event("notifications-refresh"));
    } catch (e) {
      toastError(e instanceof Error ? e.message : t("checkFailed"));
    } finally {
      setChecking(null);
      await load();
    }
  }

  async function remove(m: Method) {
    setConfirmDelete(m);
  }
  async function confirmRemove() {
    const m = confirmDelete;
    if (!m) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/payment-methods/${m._id}`, { method: "DELETE" });
      if (res.ok) success(t("paymentMethodDeleted")); else toastError("Failed to delete");
      setConfirmDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  async function move(m: Method, dir: "up" | "down") {
    const newOrder = dir === "up" ? m.order - 1 : m.order + 1;
    await fetch(`/api/admin/payment-methods/${m._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: newOrder }) });
    await load();
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink/60 dark:text-white/60">{t("addEditManualDesc")}</p>
        <button onClick={openCreate} className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100">
          <Plus size={16} /> {t("addMethod")}
        </button>
      </div>

      {loading ? <p className="mt-6 text-sm text-ink/50">{t("loading")}</p> : methods.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink/15 bg-white p-8 text-center dark:border-white/15 dark:bg-white/5">
          <CreditCard className="mx-auto text-ink/30" />
          <p className="mt-3 text-sm font-semibold text-ink dark:text-white">{t("noPaymentMethodsYet")}</p>
          <p className="mt-1 text-xs text-ink/50 dark:text-white/50">{t("addBkashDesc")}</p>
          <button onClick={openCreate} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white">{t("addFirstMethod")}</button>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-white/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-paper text-xs uppercase tracking-widest text-ink/40 dark:bg-white/5 dark:text-white/50">
                <tr>
                  <th className="px-4 py-3">{t("thOrder")}</th>
                  <th className="px-4 py-3">{t("thNameSlug")}</th>
                  <th className="px-4 py-3">{t("thType")}</th>
                  <th className="px-4 py-3">{t("thAccountProvider")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3">{t("thEnabled")}</th>
                  <th className="px-4 py-3 text-right">{t("thActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10 dark:divide-white/10">
                {methods.sort((a,b)=>a.order-b.order).map((m) => (
                  <tr key={m._id} className={!m.enabled ? "opacity-60" : ""}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="min-w-6 text-center font-mono text-xs">{m.order}</span>
                        <button onClick={() => void move(m,"up")} className="rounded p-1 hover:bg-paper dark:hover:bg-white/10"><ArrowUp size={12}/></button>
                        <button onClick={() => void move(m,"down")} className="rounded p-1 hover:bg-paper dark:hover:bg-white/10"><ArrowDown size={12}/></button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink dark:text-white flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-lg ${providerBg(m.provider)}`}><ProviderIcon provider={m.provider} size={14} /></span>{m.name}</p>
                      <p className="text-xs font-mono text-ink/50 dark:text-white/40">{m.slug}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.type==="gateway"?"bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300":"bg-paper text-ink/60 dark:bg-white/10 dark:text-white/60"}`}>{m.type}</span></td>
                    <td className="px-4 py-3 text-xs text-ink/70 dark:text-white/60 max-w-[220px] truncate">{m.type==="manual"?m.accountNumber || "—":m.provider || "gateway"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${m.type === "manual" ? "bg-emerald-500" : m.status === "CHECKING" || m.health?.status === "CHECKING" || checking===m._id ? "bg-amber-400 animate-pulse" : m.status === "ACTIVE" && m.health?.status === "HEALTHY" ? "bg-emerald-500" : m.status === "FAILED" || m.health?.status === "UNHEALTHY" ? "bg-red-500" : "bg-gray-300 dark:bg-white/20"}`} />
                        <span className={`text-xs font-semibold ${m.type === "manual" ? "text-emerald-600 dark:text-emerald-300" : m.status === "CHECKING" || m.health?.status === "CHECKING" || checking===m._id ? "text-amber-600 dark:text-amber-300" : m.status === "ACTIVE" && m.health?.status === "HEALTHY" ? "text-emerald-600 dark:text-emerald-300" : m.status === "FAILED" || m.health?.status === "UNHEALTHY" ? "text-red-600 dark:text-red-300" : "text-ink/40 dark:text-white/40"}`}>
                          {m.type === "manual" ? t("success") : m.status === "CHECKING" || m.health?.status === "CHECKING" || checking===m._id ? t("checking") : m.status === "ACTIVE" && m.health?.status === "HEALTHY" ? t("success") : m.status === "FAILED" || m.health?.status === "UNHEALTHY" ? t("fail") : t("notChecked")}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Tooltip
                        content={
                          m.type !== "manual" && (m.status !== "ACTIVE" || m.health?.status !== "HEALTHY") && !m.enabled
                            ? t("checkFailed")
                            : m.enabled
                              ? t("activeStatus")
                              : t("inactiveStatus")
                        }
                      >
                        <button
                          disabled={checking===m._id || (m.type !== "manual" && (m.status === "CHECKING" || (m.status !== "ACTIVE" || m.health?.status !== "HEALTHY") && !m.enabled))}
                          onClick={() => void toggleEnabled(m)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full p-1 transition-colors duration-200 ${m.enabled ? "bg-emerald-500" : "bg-gray-200 dark:bg-white/20"} ${m.type !== "manual" && (m.status !== "ACTIVE" || m.health?.status !== "HEALTHY") ? (!m.enabled ? "opacity-40 cursor-not-allowed" : "") : "cursor-pointer hover:shadow-sm"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${m.enabled ? "translate-x-5" : "translate-x-0"}`} />
                        </button>
                      </Tooltip>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {m.type === "manual" ? (
                          <Tooltip content={t("success")}>
                            <span className="grid h-7 w-7 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><Check size={14} /></span>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            content={
                              checking===m._id || m.status === "CHECKING" || m.health?.status === "CHECKING"
                                ? t("checking")
                                : m.health?.status === "HEALTHY" || m.status === "ACTIVE"
                                  ? t("checkSuccess")
                                  : m.health?.status === "UNHEALTHY" || m.status === "FAILED"
                                    ? t("checkFailed")
                                    : t("notChecked")
                            }
                          >
                            <button onClick={() => void checkValidity(m)} disabled={checking===m._id || m.status === "CHECKING" || m.health?.status === "CHECKING"} className={`rounded-lg border p-1.5 transition ${(m.health?.status === "HEALTHY" || m.status === "ACTIVE") ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" : m.health?.status === "UNHEALTHY" || m.status === "FAILED" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300" : "border-ink/10 hover:bg-paper dark:border-white/10 dark:hover:bg-white/10 text-ink/60 dark:text-white/60"}`}><Check size={14} className={checking===m._id || m.status === "CHECKING" ? "animate-pulse" : ""} /></button>
                          </Tooltip>
                        )}
                        <Tooltip content={t("editLabel")}>
                          <button onClick={()=>openEdit(m)} className="rounded-lg border border-ink/10 p-1.5 hover:bg-paper dark:border-white/10 dark:hover:bg-white/10"><Pencil size={14}/></button>
                        </Tooltip>
                        <Tooltip content={t("remove")}>
                          <button onClick={()=>void remove(m)} className="rounded-lg border border-ink/10 p-1.5 text-red-500 hover:bg-red-50 dark:border-white/10"><Trash2 size={14}/></button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-[28px] border border-white/20 bg-white p-7 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e] max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-2xl shadow-sm ${form.provider ? providerBg(form.provider) : "bg-paper dark:bg-white/10"} border border-white/20`}>
                  <ProviderIcon provider={form.provider} size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold leading-tight text-ink dark:text-white">{editingId ? t("editPaymentMethod") : t("addPaymentMethod")}</h3>
                  <p className="text-xs text-ink/50 dark:text-white/50">{form.type === "manual" ? t("manualNumber") : t("gatewayApi")} {form.provider ? `• ${providers.find((p)=>p.value===form.provider)?.label.split(" (")[0]}` : ""}</p>
                </div>
              </div>
              <button onClick={()=>setModalOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/60 hover:bg-red-50 hover:text-red-500 dark:bg-white/10 dark:text-white/60 dark:hover:bg-red-500 dark:hover:text-white transition"><X size={16}/></button>
            </div>
            <form onSubmit={save} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodName")} <input disabled value={form.name} required placeholder="bKash / Stripe" className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60 cursor-not-allowed" /></label>
                <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodSlug")} <input disabled value={form.slug} required pattern="[a-z0-9_-]+" placeholder="bkash" className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm font-mono dark:border-white/10 dark:bg-white/5 dark:text-white/60 cursor-not-allowed" /></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("typeLabel")}
                  <div className="mt-1">
                    <CustomSelect
                      value={form.type}
                      options={[
                        { value: "manual", label: t("manualNumber") },
                        { value: "gateway", label: t("gatewayApi") },
                      ]}
                      onChange={(v) => {
                        const newType = v as Method["type"];
                        const allowed = providers.filter((pp) => {
                          if (newType === "manual") return ["", "bkash", "nagad", "rocket"].includes(pp.value);
                          if (newType === "gateway") return ["stripe", "sslcommerz", "paypal", "custom"].includes(pp.value);
                          return true;
                        }).map((pp) => pp.value);
                        const keepProvider = allowed.includes(form.provider) ? form.provider : "";
                        setForm({ ...form, type: newType, provider: keepProvider });
                        if (keepProvider && keepProvider !== "custom") setNewPairKey(keepProvider);
                      }}
                    />
                  </div>
                </label>
                <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodOrder")} <input type="number" value={form.order} onChange={(e)=>setForm({...form,order:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>
              </div>
              <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodProvider")}
                {form.type === "manual" ? (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "bkash", label: "bKash", color: "border-[#E2136E] bg-[#E2136E]/10 text-[#E2136E]" },
                        { value: "nagad", label: "Nagad", color: "border-[#F15A29] bg-[#F15A29]/10 text-[#F15A29]" },
                        { value: "rocket", label: "Rocket", color: "border-[#8A2BE2] bg-[#8A2BE2]/10 text-[#8A2BE2]" },
                      ].map((opt) => {
                        const active = form.provider === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              const v = opt.value;
                              const label = opt.label;
                              setForm((prev) => ({
                                ...prev,
                                provider: v,
                                name: !editingId && (!prev.name || ["bKash","Nagad","Rocket",""].includes(prev.name)) ? label : prev.name,
                                slug: !editingId && (!prev.slug || ["bkash","nagad","rocket",""].includes(prev.slug)) ? v.toLowerCase() : prev.slug,
                              }));
                            }}
                            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-bold transition ${active ? `${opt.color} bg-white shadow-md dark:bg-white/10` : "border-ink/10 bg-paper text-ink/60 hover:border-ink/20 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10"}`}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-xl ${active ? opt.color.split(" ")[1] : "bg-white dark:bg-white/10"} border border-white/20`}>
                              <ProviderIcon provider={opt.value} size={16} />
                            </span>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    <CustomSelect
                      value={form.provider}
                      options={[
                        { value: "", label: "Select provider" },
                        { value: "bkash", label: "bKash (manual)" },
                        { value: "nagad", label: "Nagad (manual)" },
                        { value: "rocket", label: "Rocket (manual)" },
                      ]}
                      onChange={(v) => {
                        const label = providers.find((pp) => pp.value === v)?.label.split(" (")[0] ?? "";
                        setForm((prev) => ({
                          ...prev,
                          provider: v,
                          name: !editingId && (!prev.name || providers.some((pp) => pp.label.split(" (")[0] === prev.name)) ? label : prev.name,
                          slug: !editingId && (!prev.slug || providers.some((pp) => pp.value === prev.slug)) ? v.toLowerCase() : prev.slug,
                        }));
                      }}
                      placeholder={t("paymentMethodProvider")}
                    />
                  </div>
                ) : (
                  <div className="mt-1">
                    <CustomSelect
                      value={form.provider}
                      options={[
                        { value: "stripe", label: "Stripe (gateway)" },
                        { value: "sslcommerz", label: "SSLCommerz (gateway)" },
                        { value: "paypal", label: "PayPal (gateway)" },
                        { value: "custom", label: "Custom gateway" },
                      ]}
                      onChange={(v) => {
                        const label = providers.find((pp) => pp.value === v)?.label.split(" (")[0] ?? "";
                        setForm((prev) => ({
                          ...prev,
                          provider: v,
                          name: !editingId && (!prev.name || providers.some((pp) => pp.label.split(" (")[0] === prev.name)) ? label : prev.name,
                          slug: !editingId && (!prev.slug || providers.some((pp) => pp.value === prev.slug)) ? v.toLowerCase() : prev.slug,
                        }));
                        if (v && v !== "custom") setNewPairKey(v);
                        else if (v === "custom" && !newPairKey) setNewPairKey("apiKey");
                      }}
                      placeholder={t("paymentMethodProvider")}
                    />
                  </div>
                )}
              </label>
              {form.type==="manual" ? (
                <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodAccount")} <input value={form.accountNumber} onChange={(e)=>setForm({...form,accountNumber:e.target.value})} placeholder="01XXXXXXXXX or address" className="mt-1 h-10 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("gatewayConfigLabel")}</p>
                  {/* existing pairs */}
                  {gatewayPairs.length > 0 && (
                    <div className="space-y-2">
                      {gatewayPairs.map((pair, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input value={pair.key} disabled className="h-10 w-1/3 rounded-xl border border-ink/10 bg-paper px-3 text-sm font-mono text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60 cursor-not-allowed" placeholder={t("keyLabel")} />
                          <div className="relative flex-1">
                            <input type={pair.visible ? "text" : "password"} value={pair.value} onChange={(e) => {
                              const next = [...gatewayPairs];
                              next[idx].value = e.target.value;
                              setGatewayPairs(next);
                              const obj: Record<string, unknown> = {};
                              next.forEach(p => { if(p.key.trim()) obj[p.key.trim()] = p.value; });
                              setGatewayJson(JSON.stringify(obj, null, 2));
                            }} placeholder={t("valueLabel")} className="h-10 w-full rounded-xl border border-ink/10 bg-paper px-3 pr-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white" />
                            <button type="button" onClick={() => {
                              const next = [...gatewayPairs];
                              next[idx].visible = !next[idx].visible;
                              setGatewayPairs(next);
                            }} className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-lg text-ink/40 hover:bg-ink/5 dark:text-white/40">
                              {pair.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <button type="button" onClick={() => {
                            const next = gatewayPairs.filter((_, i) => i !== idx);
                            setGatewayPairs(next);
                            const obj: Record<string, unknown> = {};
                            next.forEach(p => { if(p.key.trim()) obj[p.key.trim()] = p.value; });
                            setGatewayJson(JSON.stringify(obj, null, 2));
                          }} className="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 text-red-500 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-500/10"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* add new pair */}
                  <div className="flex items-end gap-2 rounded-xl border border-dashed border-ink/15 bg-paper/30 p-3 dark:border-white/10 dark:bg-white/5">
                    <label className="flex-1 text-xs font-semibold text-ink/60 dark:text-white/60">{t("keyLabel")}<input value={newPairKey} disabled className="mt-1 h-9 w-full rounded-lg border border-ink/10 bg-paper px-2.5 text-sm font-mono text-ink/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60 cursor-not-allowed" placeholder="auto" /></label>
                    <label className="flex-1 text-xs font-semibold text-ink/60 dark:text-white/60">{t("valueLabel")}<div className="relative mt-1"><input disabled={!newPairKey.trim()} type={newPairVisible ? "text" : "password"} value={newPairValue} onChange={(e) => setNewPairValue(e.target.value)} placeholder="••••••••" className="h-9 w-full rounded-lg border border-ink/10 bg-white px-2.5 pr-8 text-sm disabled:bg-paper disabled:opacity-60 dark:border-white/10 dark:bg-[#1d1d35] dark:text-white" /><button type="button" disabled={!newPairKey.trim()} onClick={() => setNewPairVisible(v => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-lg text-ink/40 hover:bg-ink/5 dark:text-white/40 disabled:opacity-30"><Eye size={14} className={newPairVisible ? "hidden" : "block"} />{newPairVisible ? <EyeOff size={14} /> : null}</button></div></label>
                    <button type="button" disabled={!newPairKey.trim() || !newPairValue.trim()} onClick={() => {
                      const k = newPairKey.trim();
                      const v = newPairValue.trim();
                      if (!k || !v) return;
                      const next = [...gatewayPairs, { key: k, value: v, visible: false }];
                      setGatewayPairs(next);
                      const obj: Record<string, unknown> = {};
                      next.forEach(p => { if(p.key.trim()) obj[p.key.trim()] = p.value; });
                      setGatewayJson(JSON.stringify(obj, null, 2));
                      setNewPairKey(""); setNewPairValue(""); setNewPairVisible(false);
                    }} className="h-9 shrink-0 rounded-xl bg-primary px-4 text-xs font-bold text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-secondary dark:text-ink">{t("add")}</button>
                  </div>
                  <p className="text-xs text-ink/40 dark:text-white/40">{t("gatewayConfigHint")}</p>
                </div>
              )}
              <label className="text-sm font-semibold text-ink/70 dark:text-white/70">{t("paymentMethodInstructions")} <textarea value={form.instructions} onChange={(e)=>setForm({...form,instructions:e.target.value})} rows={4} placeholder="Send exact amount..." className="mt-1 min-h-[112px] h-28 w-full resize-none rounded-xl border border-ink/10 bg-paper p-3 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"/></label>
              {form.type === "manual" && <div className="rounded-2xl border border-ink/10 bg-paper/50 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-ink dark:text-white">{t("paymentMethodQrTitle")}</p><p className="mt-1 text-xs text-ink/50 dark:text-white/50">{t("paymentMethodQrDesc")}</p></div>{form.qrImageUrl && <button type="button" onClick={()=>setForm({...form,qrImageUrl:""})} className="text-xs font-semibold text-red-500 hover:underline">Remove QR</button>}</div><label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-primary/40 bg-white/60 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 dark:bg-white/5"><span>{form.qrImageUrl ? "Replace QR image" : "Upload or capture QR image"}</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event)=>{ const file=event.target.files?.[0]; if (!file) return; const reader=new FileReader(); reader.onload=()=>setForm({...form,qrImageUrl:String(reader.result)}); reader.readAsDataURL(file); }} /></label>{form.qrImageUrl && <div className="mt-4 flex justify-center rounded-xl border border-ink/10 bg-white p-3 dark:border-white/10 dark:bg-[#13172b]"><img src={form.qrImageUrl} alt="Payment QR preview" className="h-44 w-44 object-contain" /></div>}</div>}
              <label className="text-sm font-semibold text-ink/70 dark:text-white/70 flex items-center gap-2"><input type="checkbox" checked={form.enabled} onChange={(e)=>setForm({...form,enabled:e.target.checked})}/> {t("paymentMethodEnabled")}</label>
              {message && <p className="text-sm font-medium text-red-600">{message}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={()=>setModalOpen(false)} className="rounded-full border border-ink/10 px-4 py-2 text-sm dark:border-white/10 dark:text-white">{t("cancel")}</button>
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"><Save size={14}/>{saving ? t("saving") : editingId ? t("saveLabel") : t("add")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete ? t("deleteConfirm", { name: confirmDelete.name, slug: confirmDelete.slug }) : ""}
        description={t("confirmDeleteDesc") ?? "This action cannot be undone. The payment method will be permanently removed."}
        confirmLabel={t("remove")}
        cancelLabel={t("cancel")}
        variant="danger"
        icon="trash"
        loading={deleting}
        onConfirm={() => void confirmRemove()}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />
    </div>
  );
}
