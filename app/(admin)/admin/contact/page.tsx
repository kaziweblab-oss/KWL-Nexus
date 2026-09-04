"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Check, X, ChevronDown, Mail, Smartphone } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { isValidPhoneNumber } from "libphonenumber-js";
import { useLanguage } from "@/components/shared/LanguageProvider";

// Professional phone country list (same as login page)
const COUNTRIES = [
  { code: "BD", flag: "https://flagcdn.com/w20/bd.png", dial: "+880", name: "Bangladesh", len: [10, 11] as number | number[] },
  { code: "IN", flag: "https://flagcdn.com/w20/in.png", dial: "+91", name: "India", len: [10, 11] as number | number[] },
  { code: "US", flag: "https://flagcdn.com/w20/us.png", dial: "+1", name: "USA", len: [10, 11] as number | number[] },
  { code: "GB", flag: "https://flagcdn.com/w20/gb.png", dial: "+44", name: "UK", len: [10, 11] as number | number[] },
  { code: "PK", flag: "https://flagcdn.com/w20/pk.png", dial: "+92", name: "Pakistan", len: [10, 11] as number | number[] },
  { code: "SA", flag: "https://flagcdn.com/w20/sa.png", dial: "+966", name: "Saudi Arabia", len: [9, 10] as number | number[] },
  { code: "AE", flag: "https://flagcdn.com/w20/ae.png", dial: "+971", name: "UAE", len: [9, 10] as number | number[] },
  { code: "MY", flag: "https://flagcdn.com/w20/my.png", dial: "+60", name: "Malaysia", len: [9, 10, 11] as number | number[] },
];

function isPhoneValid(digits: string, country: (typeof COUNTRIES)[0]) {
  const d = digits.replace(/\D/g, "");
  if (!d) return false;
  try {
    const full = `${country.dial}${d.replace(/^0+/, "")}`;
    if (isValidPhoneNumber(full)) return true;
  } catch {}
  const expected = (country as unknown as { len: number | number[] }).len;
  if (Array.isArray(expected)) return expected.includes(d.length) || expected.includes(d.replace(/^0+/, "").length);
  return d.length === expected || d.length === expected + 1;
}

function detectCountryFromValue(value: string): (typeof COUNTRIES)[0] {
  const v = value.trim();
  // longest dial first to avoid +1 vs +91 collision
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) if (v.startsWith(c.dial)) return c;
  return COUNTRIES[0];
}

function parseLocalDigits(value: string, country: (typeof COUNTRIES)[0]): string {
  const v = value.trim();
  if (v.startsWith(country.dial)) return v.slice(country.dial.length).replace(/\D/g, "");
  // fallback: strip any leading + and dial-like prefix
  return v.replace(/\D/g, "").slice(-11);
}

const PHONE_TYPES = ["phone", "whatsapp"];

type ContactItem = {
  _id?: string;
  id?: string;
  type: string;
  value: string;
  label: string;
  icon: string;
  section: "getInTouch" | "social";
  isActive: boolean;
  order: number;
};

const emptyForm = {
  type: "email",
  value: "",
  label: "",
  icon: "Mail",
  section: "getInTouch" as "getInTouch" | "social",
  isActive: true,
  order: 0,
};

const contactTypes = ["email", "phone", "whatsapp", "facebook", "twitter", "instagram", "youtube", "telegram", "github", "custom"];

const iconOptions = ["Mail", "Phone", "MessageCircle", "Globe", "Play", "Instagram", "Twitter", "Facebook", "Youtube", "Send", "Link", "Shield"];

const sectionOptions = [
  { value: "getInTouch", label: "Get in Touch" },
  { value: "social", label: "Social" },
];

const typeToIcon: Record<string, string> = {
  email: "Mail",
  phone: "Phone",
  whatsapp: "MessageCircle",
  facebook: "Facebook",
  twitter: "Twitter",
  instagram: "Instagram",
  youtube: "Youtube",
  telegram: "Send",
  github: "Globe",
  custom: "Link",
};

export default function AdminContactPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ContactItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // phone professional states
  const [phoneCountry, setPhoneCountry] = useState<(typeof COUNTRIES)[0]>(COUNTRIES[0]);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const countryBtnRef = useRef<HTMLButtonElement>(null);
  const [countryDir, setCountryDir] = useState<"down" | "up">("down");
  const [valueError, setValueError] = useState<string | null>(null);
  const [valueTouched, setValueTouched] = useState(false);

  const isPhoneType = PHONE_TYPES.includes(form.type);
  const isEmailType = form.type === "email";
  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const phoneValid = useMemo(() => (isPhoneType ? isPhoneValid(phoneLocal, phoneCountry) : true), [isPhoneType, phoneLocal, phoneCountry]);
  const emailValid = useMemo(() => (isEmailType ? emailRegex.test(form.value.trim()) : true), [isEmailType, form.value, emailRegex]);
  const fullPhone = useMemo(() => `${phoneCountry.dial}${phoneLocal.replace(/^0+/, "")}`, [phoneCountry, phoneLocal]);

  // Order & duplicate helpers
  const existingOrders = useMemo(() => items.map((i) => i.order).sort((a, b) => a - b), [items]);
  const isOrderTaken = useMemo(() => items.some((i) => i.order === Number(form.order) && (i._id ?? i.id) !== editingId), [items, form.order, editingId]);
  const duplicateTypeExists = useMemo(() => form.type !== "custom" && items.some((i) => i.type === form.type && (i._id ?? i.id) !== editingId), [items, form.type, editingId]);
  const targetValueForCheck = isPhoneType ? fullPhone : form.value.trim();
  const isValueDuplicate = useMemo(() => !!targetValueForCheck && items.some((i) => i.value.trim().toLowerCase() === targetValueForCheck.toLowerCase() && (i._id ?? i.id) !== editingId), [items, targetValueForCheck, editingId]);
  const availableTypes = useMemo(() => contactTypes.filter((t) => t === "custom" || !items.some((i) => i.type === t && (i._id ?? i.id) !== editingId)), [items, editingId]);

  // Free order + select options with occupancy hint (language-aware)
  const firstFreeOrder = useMemo(() => {
    const set = new Set(existingOrders);
    let i = 0;
    while (set.has(i)) i++;
    return i;
  }, [existingOrders]);
  const orderMap = useMemo(() => {
    const m = new Map<number, ContactItem>();
    items.forEach((it) => m.set(it.order, it));
    return m;
  }, [items]);
  const maxOrderForOptions = useMemo(() => {
    if (!existingOrders.length) return 3;
    return Math.max(...existingOrders) + 1;
  }, [existingOrders]);
  const orderOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const freeLabel = t("orderFree");
    for (let o = 0; o <= maxOrderForOptions; o++) {
      const occupying = orderMap.get(o);
      const isSelf = occupying && (occupying._id ?? occupying.id) === editingId;
      if (occupying && !isSelf) {
        opts.push({ value: String(o), label: `${o} — ${occupying.label} (${occupying.type})` });
      } else if (isSelf) {
        opts.push({ value: String(o), label: `${o} — ${occupying!.label} (${occupying!.type})` });
      } else {
        opts.push({ value: String(o), label: `${o} — ${freeLabel}` });
      }
    }
    return opts;
  }, [maxOrderForOptions, orderMap, editingId, t]);

  // Keep form.value in sync when phone type is active
  useEffect(() => {
    if (isPhoneType) setForm((c) => ({ ...c, value: fullPhone }));
  }, [fullPhone, isPhoneType]);

  // When editing or type changes, sync phoneLocal/country from form.value
  useEffect(() => {
    if (isPhoneType && form.value) {
      const c = detectCountryFromValue(form.value);
      // avoid infinite loop: only update if country or local differs
      if (c.dial !== phoneCountry.dial) setPhoneCountry(c);
      const local = parseLocalDigits(form.value, c);
      if (local !== phoneLocal) setPhoneLocal(local);
    }
    if (!isPhoneType) setValueTouched(false);
  }, [form.type, form.value, isPhoneType]); // eslint-disable-line react-hooks/exhaustive-deps
  // Also when modal opens for new contact, reset phoneLocal
  useEffect(() => {
    if (modalOpen && !editingId && isPhoneType && !form.value) {
      setPhoneLocal("");
      setPhoneCountry(COUNTRIES[0]);
      setValueError(null);
      setValueTouched(false);
    }
  }, [modalOpen, editingId, isPhoneType, form.value]);

  // Close country window when scrolling — so window closes or follows scroll as requested
  useEffect(() => {
    if (!countryOpen) return;
    const handler = () => setCountryOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [countryOpen]);

  // Flip country window up if not enough space below (main window niche beshi jayga na thakle uporer dike)
  useEffect(() => {
    if (!countryOpen || !countryBtnRef.current) return;
    const r = countryBtnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const need = 230;
    setCountryDir(spaceBelow < need && spaceAbove > spaceBelow ? "up" : "down");
  }, [countryOpen]);

  async function loadContacts() {
    try {
      const response = await fetch("/api/admin/contact");
      const text = await response.text();
      const payload = text ? (JSON.parse(text) as { data?: ContactItem[] }) : {};
      if (!response.ok) return;
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch {}
  }

  useEffect(() => {
    void loadContacts();
  }, []);

  async function submitContact(event: React.FormEvent) {
    event.preventDefault();
    setValueError(null);
    setValueTouched(true);
    // Duplicate type/value prevention (hide already used types, block duplicate value)
    if (duplicateTypeExists) {
      setValueError(t("typeAlreadyExists", { type: form.type }));
      return;
    }
    if (isValueDuplicate) {
      setValueError(t("valueAlreadyExists"));
      return;
    }
    // Professional conditional validation: phone needs country+valid number, email needs valid email
    if (isPhoneType) {
      if (!phoneLocal.trim()) {
        setValueError(t("phoneRequired"));
        return;
      }
      if (!phoneValid) {
        setValueError(t("validPhoneWithCountry"));
        return;
      }
    } else if (isEmailType) {
      if (!form.value.trim()) {
        setValueError(t("emailRequired"));
        return;
      }
      if (!emailRegex.test(form.value.trim())) {
        setValueError(t("validEmailRequired"));
        return;
      }
    } else {
      if (!form.value.trim()) {
        setValueError(t("valueRequired"));
        return;
      }
    }
    const payload = {
      ...form,
      value: isPhoneType ? fullPhone : form.value.trim(),
      icon: form.icon || "Link",
      order: Number(form.order || 0),
    };

    const url = editingId ? `/api/admin/contact/${editingId}` : "/api/admin/contact";
    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setPhoneLocal("");
      setPhoneCountry(COUNTRIES[0]);
      setValueError(null);
      setValueTouched(false);
      await loadContacts();
    } else {
      try {
        const err = await response.json();
        const msg = err?.error?.fieldErrors?.value?.[0] || err?.error?.formErrors?.[0] || err?.error || "Failed to save contact";
        if (typeof msg === "string") setValueError(msg);
        else setValueError("Validation failed");
      } catch {
        setValueError("Failed to save contact");
      }
    }
  }

  async function toggleStatus(item: ContactItem) {
    await fetch(`/api/admin/contact/${item._id ?? item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    await loadContacts();
  }

  async function removeItem(item: ContactItem) {
    await fetch(`/api/admin/contact/${item._id ?? item.id}`, { method: "DELETE" });
    await loadContacts();
  }

  async function moveItem(item: ContactItem, direction: "up" | "down") {
    const currentOrder = item.order ?? 0;
    const nextOrder = direction === "up" ? Math.max(0, currentOrder - 1) : currentOrder + 1;
    await fetch(`/api/admin/contact/${item._id ?? item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: nextOrder }),
    });
    await loadContacts();
  }

  return (
    <main>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary dark:text-secondary">{t("contactManagement")}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink dark:text-white">{t("publicContactLinks")}</h1>
        </div>
        <button onClick={() => {
          const initialType = availableTypes.includes(emptyForm.type) ? emptyForm.type : (availableTypes[0] ?? "custom");
          setForm({ ...emptyForm, type: initialType, icon: typeToIcon[initialType] ?? emptyForm.icon, order: firstFreeOrder });
          setEditingId(null); setPhoneCountry(COUNTRIES[0]); setPhoneLocal(""); setValueError(null); setValueTouched(false); setModalOpen(true);
        }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white">
          <Plus size={16} /> {t("newContact")}
        </button>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white dark:border-white/10 dark:bg-[#1d1d35]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper text-ink/55 dark:bg-[#15152b] dark:text-white/70">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("thType")}</th>
                <th className="px-4 py-3 font-semibold">{t("thLabel")}</th>
                <th className="px-4 py-3 font-semibold">{t("thValue")}</th>
                <th className="px-4 py-3 font-semibold">{t("status")}</th>
                <th className="px-4 py-3 font-semibold">{t("thOrder")}</th>
                <th className="px-4 py-3 font-semibold text-right">{t("thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id ?? item.id ?? `${item.type}-${item.label}`} className="border-t border-ink/10 dark:border-white/10">
                  <td className="px-4 py-3 font-medium text-ink dark:text-white">{item.type}</td>
                  <td className="px-4 py-3 text-ink/75 dark:text-white/75">{item.label}</td>
                  <td className="px-4 py-3 text-ink/60 dark:text-white/60">{item.value}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => void toggleStatus(item)} className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                      {item.isActive ? t("activeStatus") : t("inactiveStatus")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-ink/55 dark:text-white/55">{item.order ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => {
                        setForm({ ...item, icon: item.icon || "Link" });
                        setEditingId(item._id ?? item.id ?? null);
                        // Pre-fill phone country/local if phone type
                        if (PHONE_TYPES.includes(item.type) && item.value) {
                          const c = detectCountryFromValue(item.value);
                          setPhoneCountry(c);
                          setPhoneLocal(parseLocalDigits(item.value, c));
                        } else {
                          setPhoneLocal("");
                          setPhoneCountry(COUNTRIES[0]);
                        }
                        setValueError(null);
                        setValueTouched(false);
                        setModalOpen(true);
                      }} className="rounded-lg border border-ink/10 p-2 text-ink/60 hover:text-primary" aria-label="Edit contact"><Pencil size={15} /></button>
                      <button onClick={() => void moveItem(item, "up")} className="rounded-lg border border-ink/10 p-2 text-ink/60 hover:text-primary" aria-label="Move contact up"><ArrowUp size={15} /></button>
                      <button onClick={() => void moveItem(item, "down")} className="rounded-lg border border-ink/10 p-2 text-ink/60 hover:text-primary" aria-label="Move contact down"><ArrowDown size={15} /></button>
                      <button onClick={() => void removeItem(item)} className="rounded-lg border border-ink/10 p-2 text-ink/60 hover:text-red-500" aria-label="Delete contact"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[96vh] max-h-[96dvh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-[#1d1d35]">
            <div className="flex items-center justify-between gap-3 p-6 pb-4 shrink-0 border-b border-ink/5 dark:border-white/10">
              <h2 className="text-xl font-bold text-ink dark:text-white">{editingId ? t("editContact") : t("addContact")}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-ink/50 transition hover:border-red-500 hover:text-red-500 dark:text-white/60 dark:hover:border-red-400 dark:hover:text-red-400">{t("close")}</button>
            </div>
            <form onSubmit={submitContact} className="flex-1 overflow-y-auto p-6 pt-4 space-y-4 min-h-0 overscroll-contain">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  {t("typeLabel")} {availableTypes.length < contactTypes.length && <span className="text-xs font-normal text-ink/40 dark:text-white/45">· {contactTypes.length - availableTypes.length} used, hidden</span>}
                  <div className="mt-2">
                    <CustomSelect
                      value={form.type}
                      options={availableTypes.length ? availableTypes : contactTypes}
                      onChange={(v) => {
                        const wasPhone = PHONE_TYPES.includes(form.type);
                        const willPhone = PHONE_TYPES.includes(v);
                        setValueError(null);
                        setValueTouched(false);
                        if (willPhone && !wasPhone) {
                          // Switching to phone: reset to clean phone input
                          setPhoneCountry(COUNTRIES[0]);
                          setPhoneLocal("");
                          setForm((current) => ({ ...current, type: v, value: "", icon: typeToIcon[v] ?? current.icon }));
                        } else if (!willPhone && wasPhone) {
                          // Switching away from phone: clear value
                          setPhoneLocal("");
                          setForm((current) => ({ ...current, type: v, value: "", icon: typeToIcon[v] ?? current.icon }));
                        } else {
                          // email <-> other: clear value if type family changes
                          const needsClear = (form.type === "email") !== (v === "email");
                          setForm((current) => ({ ...current, type: v, value: needsClear ? "" : current.value, icon: typeToIcon[v] ?? current.icon }));
                        }
                      }}
                    />
                  </div>
                  {duplicateTypeExists && <p className="mt-1.5 text-xs font-medium text-red-600">Type &quot;{form.type}&quot; already exists — hidden from list when not editing</p>}
                </label>
                <label className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  {t("iconNameLabel")}
                  <div className="mt-2">
                    <CustomSelect value={form.icon} options={iconOptions} onChange={(v) => setForm((current) => ({ ...current, icon: v }))} />
                  </div>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  Section
                  <div className="mt-2">
                    <CustomSelect value={form.section} options={sectionOptions} onChange={(v) => setForm((current) => ({ ...current, section: v as never }))} />
                  </div>
                </div>
                <label className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  {t("orderLabelContact")}
                  <input disabled value={orderOptions.find((o) => o.value === String(form.order))?.label ?? String(form.order)} className={`mt-2 h-11 w-full rounded-xl border bg-gray-100 px-3 text-sm text-ink/60 dark:border-white/10 dark:bg-white/10 dark:text-white/60 ${isOrderTaken ? "border-yellow-400 ring-2 ring-yellow-300" : "border-ink/10"}`} />
                  {/* Select-tab pills only — no select tag */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {orderOptions.map((opt) => {
                      const isSelected = String(form.order) === opt.value;
                      const occupying = orderMap.get(Number(opt.value));
                      const isOccupied = !!occupying && (occupying._id ?? occupying.id) !== editingId;
                      return (
                        <button key={opt.value} type="button" onClick={() => setForm((c) => ({ ...c, order: Number(opt.value) }))} className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${isSelected ? "bg-primary text-white border-primary shadow" : isOccupied ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-ink/10 text-ink/60 hover:bg-paper dark:bg-white/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"}`}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-ink/50 dark:text-white/50">
                    {items.length} {t("ordersSet")}: {existingOrders.length ? existingOrders.join(", ") : "none"} · {t("nextSuggested")} {firstFreeOrder}
                  </p>
                  {isOrderTaken && (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                      <p className="text-xs font-semibold text-amber-700">⚠️ {t("orderTakenWarning")}</p>
                      <p className="mt-1 text-xs text-amber-600">
                        {(() => {
                          const shifting = items.filter((it) => it.order >= Number(form.order) && (it._id ?? it.id) !== editingId).sort((a, b) => a.order - b.order);
                          if (!shifting.length) return null;
                          return `Preview: ${shifting.map((s) => `${s.label} (${s.order} → ${s.order + 1})`).join(", ")} — save dile shift hobe, ekhon change hobe na`;
                        })()}
                      </p>
                    </div>
                  )}
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  {t("labelField")}
                  <input value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} required placeholder={isPhoneType ? "KWL Phone" : isEmailType ? "Support Email" : "Label"} className="mt-2 h-11 w-full rounded-xl border border-ink/10 bg-paper px-3 text-sm text-ink placeholder:text-ink/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40" />
                </label>
                <label className="block text-sm font-semibold text-ink/60 dark:text-white/75">
                  <span className="flex items-center gap-2">{t("valueField")} {isPhoneType && <span className="inline-flex items-center gap-1 text-xs font-normal text-ink/40 dark:text-white/45"><Smartphone size={12} /> phone with country code</span>} {isEmailType && <span className="inline-flex items-center gap-1 text-xs font-normal text-ink/40 dark:text-white/45"><Mail size={12} /> valid email</span>}</span>
                  {isPhoneType ? (
                    <div className={`relative mt-2 flex min-w-0 items-center gap-1.5 rounded-xl border bg-paper px-1.5 dark:border-white/10 dark:bg-white/5 ${valueTouched && !phoneValid ? "border-red-400 ring-2 ring-red-400/20" : valueTouched && phoneValid && phoneLocal ? "border-green-500 ring-2 ring-green-500/20" : "border-ink/10"}`}>
                      <button ref={countryBtnRef} type="button" onClick={() => setCountryOpen((v) => !v)} className="flex w-[90px] shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-sm font-semibold text-ink border border-ink/10 hover:bg-paper transition-colors whitespace-nowrap dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
                        <ChevronDown size={11} className={`shrink-0 text-ink/50 dark:text-white/50 transition-transform duration-300 ease-in-out ${countryOpen ? "rotate-180" : "rotate-0"}`} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={phoneCountry.flag} alt={phoneCountry.code} width={18} height={13} className="h-3 w-[18px] rounded-sm object-cover ring-1 ring-black/5 shrink-0" />
                        <span className="shrink-0">{phoneCountry.dial}</span>
                      </button>
                      <span className="h-5 w-px shrink-0 bg-ink/10 dark:bg-white/10" />
                      <input type="tel" inputMode="numeric" value={phoneLocal} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); setPhoneLocal(v); if (!valueTouched) setValueTouched(true); if (valueError) setValueError(null); }} onBlur={() => setValueTouched(true)} placeholder="1310050878" required className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-ink/40 text-ink dark:text-white dark:placeholder:text-white/40" />
                      {phoneLocal.length > 0 && (phoneValid ? <Check size={14} className="shrink-0 text-green-600" /> : <X size={14} className="shrink-0 text-red-500" />)}
                      {countryOpen && (
                        <div className={`absolute left-0 right-0 z-20 max-h-56 overflow-auto rounded-xl border border-ink/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-[#1a1a2e] ${countryDir === "up" ? "bottom-full mb-2" : "top-full mt-2"}`}>
                          {COUNTRIES.map((c) => (
                            <button key={c.code} type="button" onClick={() => { setPhoneCountry(c); setValueTouched(true); setCountryOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${phoneCountry.code === c.code ? "bg-primary text-white" : "text-ink hover:bg-primary/10 hover:text-primary dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"}`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={c.flag} alt={c.code} width={20} height={14} className="h-3.5 w-5 rounded-sm object-cover ring-1 ring-black/5" />
                              <span className="font-medium">{c.dial}</span>
                              <span className="text-xs opacity-60">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : isEmailType ? (
                    <div className={`mt-2 flex items-center gap-2 rounded-xl border bg-paper px-3 dark:border-white/10 dark:bg-white/5 ${valueTouched && !emailValid ? "border-red-400 ring-2 ring-red-400/20" : valueTouched && emailValid && form.value ? "border-green-500 ring-2 ring-green-500/20" : "border-ink/10"}`}>
                      <Mail size={16} className="text-ink/40 dark:text-white/40" />
                      <input type="email" value={form.value} onChange={(e) => { setForm((c) => ({ ...c, value: e.target.value })); if (!valueTouched) setValueTouched(true); if (valueError) setValueError(null); }} onBlur={() => setValueTouched(true)} placeholder="support@kwl-nexus.com" required className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink/40 text-ink dark:text-white dark:placeholder:text-white/40" />
                      {form.value.length > 0 && (emailValid ? <Check size={16} className="shrink-0 text-green-600" /> : <X size={16} className="shrink-0 text-red-500" />)}
                    </div>
                  ) : (
                    <input value={form.value} onChange={(e) => { setForm((c) => ({ ...c, value: e.target.value })); if (valueError) setValueError(null); }} required placeholder={form.type === "custom" ? "https://..." : "Enter value"} className={`mt-2 h-11 w-full rounded-xl border bg-paper px-3 text-sm text-ink placeholder:text-ink/40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40 ${valueError ? "border-red-400 ring-2 ring-red-400/20" : "border-ink/10"}`} />
                  )}
                  {valueError && <p className="mt-1.5 text-xs font-medium text-red-600">{valueError}</p>}
                  {!valueError && isValueDuplicate && <p className="mt-1.5 text-xs font-medium text-amber-600">⚠️ This value already exists — duplicate not allowed</p>}
                  {isPhoneType && valueTouched && !valueError && !isValueDuplicate && phoneLocal && (phoneValid ? <p className="mt-1.5 text-xs font-medium text-green-600">✓ Valid phone: {fullPhone}</p> : <p className="mt-1.5 text-xs font-medium text-red-600">Invalid phone for {phoneCountry.name}</p>)}
                  {isEmailType && valueTouched && !valueError && !isValueDuplicate && form.value && !emailValid && <p className="mt-1.5 text-xs font-medium text-red-600">Please enter a valid email</p>}
                </label>
              </div>
              <label className="flex items-center gap-3 text-sm font-semibold text-ink/60 dark:text-white/75">
                <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                {t("activeOnPublicPage")}
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-transparent px-4 py-2.5 text-sm font-semibold text-ink/60 transition hover:border-red-500 hover:text-red-500 dark:text-white/70 dark:hover:border-red-400 dark:hover:text-red-400">{t("cancel")}</button>
                <button type="submit" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">{editingId ? t("saveChanges") : t("createContact")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
