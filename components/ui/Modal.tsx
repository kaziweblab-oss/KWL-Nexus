"use client";

import { X } from "lucide-react";

export function Modal({ open, title, children, onClose, onConfirm, confirmLabel = "Confirm", danger = false }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void; onConfirm?: () => void; confirmLabel?: string; danger?: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#171b31]"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-ink/50 hover:bg-paper dark:text-white/50"><X size={18} /></button></div><div className="mt-4 text-sm text-ink/70 dark:text-white/70">{children}</div>{onConfirm && <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-semibold text-ink dark:border-white/10 dark:text-white">Cancel</button><button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${danger ? "bg-red-600" : "bg-primary"}`}>{confirmLabel}</button></div>}</div></div>;
}
