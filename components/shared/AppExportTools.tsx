"use client";

import { Download, FileJson, FileText, RefreshCw } from "lucide-react";
import { useState } from "react";

const formatOptions = ["json", "csv"] as const;

type ExportType = "users" | "payments" | "feedback";

export function AppExportTools() {
  const [format, setFormat] = useState<(typeof formatOptions)[number]>("json");
  const [loading, setLoading] = useState<ExportType | null>(null);

  async function exportData(type: ExportType) {
    setLoading(type);
    const response = await fetch(`/api/admin/export?type=${type}&format=${format}`);
    if (!response.ok) {
      setLoading(null);
      return;
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${type}.${format}`;
    link.click();
    URL.revokeObjectURL(href);
    setLoading(null);
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6">
      <div className="flex items-center gap-3">
        <Download className="text-primary" size={18} />
        <h2 className="font-bold text-ink">Export data</h2>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {formatOptions.map((option) => (
          <button key={option} onClick={() => setFormat(option)} className={`rounded-full px-4 py-2 text-sm font-semibold ${format === option ? "bg-primary text-white" : "bg-paper text-ink/60"}`}>
            {option.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { key: "users", label: "Users", icon: FileText },
          { key: "payments", label: "Payments", icon: FileJson },
          { key: "feedback", label: "Feedback", icon: RefreshCw },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => void exportData(key as ExportType)} className="rounded-2xl border border-ink/10 bg-paper p-4 text-left transition hover:border-primary hover:bg-primary/5" disabled={loading !== null}>
            <div className="flex items-center justify-between">
              <Icon size={18} className="text-primary" />
              {loading === key && <span className="text-xs font-semibold uppercase tracking-widest text-primary">Exporting</span>}
            </div>
            <p className="mt-5 font-semibold text-ink">{label}</p>
            <p className="mt-1 text-xs text-ink/50">{format.toUpperCase()} format</p>
          </button>
        ))}
      </div>
    </section>
  );
}
