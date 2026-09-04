"use client";

import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  icon?: "trash" | "alert";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = "danger",
  loading = false,
  icon = "trash",
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  if (!open) return null;
  const confirmText = confirmLabel ?? t("remove");
  const cancelText = cancelLabel ?? t("cancel");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button aria-label="close" onClick={onCancel} className="absolute inset-0 bg-ink/55 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-[24px] border border-white/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/50 hover:bg-ink/5 hover:text-ink dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/15"
        >
          <X size={16} />
        </button>
        <div className="flex gap-4">
          <div
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${
              variant === "danger"
                ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300"
                : "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300"
            }`}
          >
            {icon === "trash" ? <Trash2 size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-base font-bold leading-tight text-ink dark:text-white">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/60 dark:text-white/60">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-ink/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-paper disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition disabled:opacity-50 ${
              variant === "danger"
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20 dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-primary hover:bg-primary/90 shadow-primary/20"
            }`}
          >
            {loading ? t("loading") : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
